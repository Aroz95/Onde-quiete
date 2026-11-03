// Misure dell'ambiente Pioggia (NAT-03, NAT-06): carattere per intensità, loudness,
// tuoni lontani e vicini, caso peggiore. Eseguito in Chromium da pioggia.cjs.
import { createRainEnvironment, RAIN_CURVES } from "../../src/audio/env/rainEnvironment.js";
import { defaultConfig, setParam, applyQuick } from "../../src/environments/model.js";
import { seededRandom } from "../../src/audio/env/scheduler.js";
import { createGraph } from "../../src/audio/graph.js";

const SR = 48000;
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// rende un ambiente offline; `kWeight` aggiunge la pesatura K per la loudness
async function render(config, seconds, { kWeight = false, viaGraph = false, volume = 1, seed = 5 } = {}) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  let dest = ctx.destination;
  if (kWeight) {
    const shelf = ctx.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
    shelf.connect(hp).connect(ctx.destination);
    dest = shelf;
  }
  let graph = null;
  if (viaGraph) {
    graph = createGraph(ctx, dest);
    graph.master.gain.value = volume;
    // come nell'app con un ambiente: tono e strato natura dei preset spenti
    graph.toneGain.gain.value = 0; graph.natureGain.gain.value = 0; graph.noiseGain.gain.value = 0;
    dest = graph.envBus;
  }
  const env = createRainEnvironment(ctx, dest, config, { rng: seededRandom(seed) });
  await env.loaded();
  env.setActive(true);
  env.topUp();
  const out = await ctx.startRendering();
  return { out, env };
}

function stats(out, fromS = 2) {
  const L = out.getChannelData(0), R = out.getChannelData(1);
  let peak = 0, sum = 0, n = 0, zc = 0, clip = 0;
  for (let i = SR * fromS; i < L.length; i++) {
    for (const d of [L, R]) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 1) clip++; sum += d[i] * d[i]; n++; }
    if ((L[i - 1] < 0) !== (L[i] < 0)) zc++;
  }
  // granularità: livello in finestre da 5 ms; quanto i picchi brevi (95° percentile)
  // emergono sul livello tipico (mediana). Alta = gocce isolate, bassa = scroscio continuo
  const win = Math.floor(SR * 0.005), levels = [];
  for (let i = SR * fromS; i + win <= L.length; i += win) { let s = 0; for (let j = i; j < i + win; j++) s += L[j] * L[j]; levels.push(Math.sqrt(s / win)); }
  levels.sort((a, b) => a - b);
  const grain = db(levels[Math.floor(levels.length * 0.95)]) - db(levels[Math.floor(levels.length / 2)] || 1e-9);
  const secs = (L.length - SR * fromS) / SR;
  const rms = Math.sqrt(sum / n);
  return { peakDb: +db(peak).toFixed(1), rmsDb: +db(rms).toFixed(1), crestDb: +(db(peak) - db(rms)).toFixed(1),
    brightnessHz: Math.round(zc / secs / 2), granularitaDb: +grain.toFixed(1), clipped: clip };
}
const lufs = (out) => {
  let ms = 0;
  for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); let s = 0; for (let i = SR * 2; i < d.length; i++) s += d[i] * d[i]; ms += s / (d.length - SR * 2); }
  return +(-0.691 + 10 * Math.log10(ms)).toFixed(1);
};

const rainOnly = (intensity) => setParam("rain", defaultConfig("rain"), "rain", "intensity", intensity);

window.intensita = async () => {
  const rows = [];
  for (const x of [0, 33, 66, 100]) {
    const c = rainOnly(x);
    const plain = stats((await render(c, 12)).out);
    const loud = lufs((await render(c, 12, { kWeight: true })).out);
    rows.push({ intensita: x, lufs: loud, ...plain });
  }
  return { rows, comp: RAIN_CURVES.comp };
};

window.tuoni = async () => {
  const res = {};
  for (const [name, dist] of [["lontani", 10], ["vicini", 90]]) {
    let c = setParam("rain", rainOnly(20), "thunder", "on", true);
    c = setParam("rain", c, "thunder", "frequency", 100);
    c = setParam("rain", c, "thunder", "distance", dist);
    c = setParam("rain", c, "rain", "level", 0); // solo tuoni
    const { out } = await render(c, 60);
    res[name] = stats(out, 1);
  }
  return res;
};

window.vento = async () => {
  const res = {};
  for (const [name, s] of [["brezza", 5], ["burrasca", 95]]) {
    let c = setParam("rain", rainOnly(20), "wind", "on", true);
    c = setParam("rain", c, "wind", "strength", s);
    c = setParam("rain", c, "rain", "level", 0);
    const { out } = await render(c, 40);
    res[name] = { ...stats(out), lufs: lufs((await render(c, 40, { kWeight: true })).out) };
  }
  return res;
};

window.peggiore = async () => {
  let c = applyQuick("rain", defaultConfig("rain"), "storm");
  for (const [cid, k, v] of [["rain", "intensity", 100], ["rain", "level", 100], ["thunder", "level", 100], ["thunder", "distance", 100], ["thunder", "frequency", 100], ["wind", "strength", 100], ["wind", "level", 100], ["wind", "gusts", 100]]) c = setParam("rain", c, cid, k, v);
  const { out, env } = await render(c, 75, { viaGraph: true, volume: 1 });
  return { ...stats(out), sorgentiAttiveAllaFine: env.liveCount() };
};
