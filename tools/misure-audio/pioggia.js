// Misure dell'ambiente Pioggia (NAT-03, NAT-06): carattere per intensità, loudness,
// tuoni lontani e vicini, caso peggiore. Eseguito in Chromium da pioggia.cjs.
import { createRainEnvironment, RAIN_CURVES } from "../../src/audio/env/rainEnvironment.js";
import { defaultConfig, setParam, applyQuick } from "../../src/environments/model.js";
import { seededRandom } from "../../src/audio/env/scheduler.js";
import { createGraph } from "../../src/audio/graph.js";

const SR = 48000;
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// rende un ambiente offline; `kWeight` aggiunge la pesatura K per la loudness
async function render(config, seconds, { kWeight = false, viaGraph = false, volume = 1, seed = 5, phone = false } = {}) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  let dest = ctx.destination;
  if (phone) {
    const h1 = ctx.createBiquadFilter(); h1.type = "highpass"; h1.frequency.value = 150;
    const h2 = ctx.createBiquadFilter(); h2.type = "highpass"; h2.frequency.value = 150;
    h1.connect(h2).connect(dest); dest = h1;
  }
  if (kWeight) {
    const shelf = ctx.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
    shelf.connect(hp).connect(dest);
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

// ── difetti di timbro ─────────────────────────────────────────────────────
// Effetto "metallico" da copie ritardate (flanger, filtro a pettine): picco dell'autocorrelazione
// normalizzata tra 0,3 e 25 ms, mediata su molte finestre. Rumore senza copie: vicino a 0.
function combScore(out, fromS = 2) {
  const d = out.getChannelData(0);
  const N = 4096, maxLag = Math.floor(SR * 0.025), minLag = Math.floor(SR * 0.0003);
  let total = 0, wins = 0;
  for (let st = SR * fromS; st + N + maxLag < d.length && wins < 40; st += SR * 0.25, wins++) {
    let e0 = 0; for (let i = 0; i < N; i++) e0 += d[st + i] * d[st + i];
    let best = 0;
    for (let lag = minLag; lag < maxLag; lag += 1) {
      let c = 0, e1 = 0;
      for (let i = 0; i < N; i += 2) { c += d[st + i] * d[st + i + lag]; e1 += d[st + i + lag] * d[st + i + lag]; }
      const r = c / Math.sqrt((e0 / 2) * e1 + 1e-20);
      if (r > best) best = r;
    }
    total += best;
  }
  return +(total / wins).toFixed(2);
}

// Note "metalliche" (risonanze strette): rapporto tra il picco dello spettro e la mediana
// dei suoi vicini, tra 800 Hz e 8 kHz, sul massimo di molte finestre. Rumore liscio: pochi dB.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(a * k), wi = Math.sin(a * k);
      const xr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, xi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
      re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi;
    }
  }
}
function tonalScore(out, fromS = 2) {
  const d = out.getChannelData(0), N = 8192;
  const lo = Math.floor((800 / SR) * N), hi = Math.floor((8000 / SR) * N);
  const avg = new Float64Array(N / 2);
  let wins = 0;
  for (let st = SR * fromS; st + N < d.length && wins < 60; st += N / 2, wins++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[st + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 0; k < N / 2; k++) avg[k] += re[k] * re[k] + im[k] * im[k];
  }
  // spettro medio: un picco stabile (risonanza) sopravvive alla media, il rumore no
  let worst = 0;
  for (let k = lo; k < hi; k++) {
    const nb = []; for (let j = k - 40; j <= k + 40; j++) if (j !== k) nb.push(avg[j]);
    nb.sort((a, b) => a - b);
    worst = Math.max(worst, avg[k] / (nb[nb.length >> 1] || 1e-20));
  }
  return +(10 * Math.log10(worst)).toFixed(1);
}

// equilibrio dello spettro: baricentro (Hz) e quota sopra i 6 kHz (dB).
// La pioggia vera ha il baricentro tra 2 e 5 kHz; impulsi molto acuti suonano come grandine
function spectrum(out, fromS = 2) {
  const d = out.getChannelData(0), N = 8192;
  const cut = Math.floor((6000 / SR) * N);
  let hi = 0, all = 0, fw = 0, wins = 0;
  for (let st = SR * fromS; st + N < d.length && wins < 60; st += N / 2, wins++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[st + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; all += e; fw += e * (k * SR / N); if (k >= cut) hi += e; }
  }
  return { centroideHz: Math.round(fw / all), acutiDb: +(10 * Math.log10(hi / all)).toFixed(1) };
}

// energia per bande (dB rispetto al totale). Sotto i 60 Hz la gran parte dei telefoni e degli
// auricolari non riproduce nulla: un tuono "con i bassi" deve averne tra 60 e 250 Hz
function bands(out, fromS = 0, toS = Infinity) {
  const d = out.getChannelData(0), N = 8192, edges = [0, 60, 250, 1000, 24000];
  const e = [0, 0, 0, 0]; let all = 0;
  for (let st = Math.floor(SR * fromS); st + N < Math.min(d.length, SR * toS); st += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[st + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const f = (k * SR) / N, x = re[k] * re[k] + im[k] * im[k]; all += x; for (let b = 0; b < 4; b++) if (f >= edges[b] && f < edges[b + 1]) e[b] += x; }
  }
  const r = (x) => +(10 * Math.log10(x / all)).toFixed(1);
  return { sotto60: r(e[0]), da60a250: r(e[1]), da250a1k: r(e[2]), sopra1k: r(e[3]) };
}

window.tuonoForte = async () => {
  const res = {};
  for (const [name, dist, power] of [["violento vicinissimo", 100, 100], ["violento medio", 50, 100], ["moderato lontano", 25, 40]]) {
    let c = setParam("rain", rainOnly(20), "thunder", "on", true);
    for (const [k, v] of [["frequency", 0], ["distance", dist], ["power", power]]) c = setParam("rain", c, "thunder", k, v);
    c = setParam("rain", c, "rain", "level", 0);
    const { out } = await render(c, 30);
    const L = out.getChannelData(0); let first = 0; while (first < L.length && Math.abs(L[first]) < 1e-3) first++;
    const t = first / SR;
    res[name] = { ...bands(out, t, t + 8), ...stats(out, t) };
  }
  return res;
};

// corpo grave: quota di energia sotto i 500 Hz rispetto al totale (dB)
function bodyShare(out, fromS = 2) {
  const d = out.getChannelData(0), N = 8192;
  const cut = Math.floor((500 / SR) * N);
  let low = 0, all = 0, wins = 0;
  for (let st = SR * fromS; st + N < d.length && wins < 60; st += N / 2, wins++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = d[st + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; all += e; if (k < cut) low += e; }
  }
  return +(10 * Math.log10(low / all)).toFixed(1);
}

window.timbro = async () => {
  const rows = [];
  for (const x of [0, 33, 66, 100]) {
    const { out } = await render(rainOnly(x), 14);
    const st = stats(out);
    rows.push({ intensita: x, metallicoPettine: combScore(out), notePiccoDb: tonalScore(out), granularitaDb: st.granularitaDb, corpoGraveDb: bodyShare(out), ...spectrum(out), crestDb: st.crestDb });
  }
  // pioggia e vento insieme: la stessa materia prima a velocità diverse crea il pettine
  let c = setParam("rain", rainOnly(50), "wind", "on", true);
  const { out } = await render(c, 14);
  rows.push({ intensita: "50 + vento", metallicoPettine: combScore(out), notePiccoDb: tonalScore(out), granularitaDb: stats(out).granularitaDb, crestDb: stats(out).crestDb });
  return { rows, comp: RAIN_CURVES.comp };
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
  // vicinanza e potenza ai due estremi e al centro: colore, livello e durata devono cambiare
  for (const [name, dist, power] of [["lontanissimi", 0, 40], ["lontani", 25, 40], ["medi", 50, 40], ["vicini", 75, 40], ["vicinissimi", 100, 40],
    ["deboli (medi)", 50, 0], ["violenti (medi)", 50, 100], ["violenti vicinissimi", 100, 100]]) {
    let c = setParam("rain", rainOnly(20), "thunder", "on", true);
    c = setParam("rain", c, "thunder", "frequency", 30);
    c = setParam("rain", c, "thunder", "distance", dist);
    c = setParam("rain", c, "thunder", "power", power);
    c = setParam("rain", c, "rain", "level", 0); // solo tuoni
    const { out } = await render(c, 40);
    // durata del primo tuono: tempo in cui resta sopra −40 dB dal suo picco
    const L = out.getChannelData(0), win = SR / 10, lv = [];
    for (let i = 0; i + win <= L.length; i += win) { let s = 0; for (let j = i; j < i + win; j++) s += L[j] * L[j]; lv.push(Math.sqrt(s / win)); }
    const top = Math.max(...lv); const first = lv.findIndex((x) => x > top * 0.01);
    let last = first; while (last + 1 < lv.length && lv[last + 1] > top * 0.01) last++;
    const from = first / 10; // misure dall'arrivo del primo tuono
    res[name] = { ...stats(out, from), ...spectrum(out, from), durataS: +((last - first) / 10).toFixed(1) };
  }
  return res;
};

// tuoni dentro il mix completo dell'app (limitatore compreso), pioggia intensa al volume del 70%:
// quanto il secondo più forte di un tuono supera il livello tipico della pioggia
window.potenza = async () => {
  const res = {};
  for (const power of [40, 75, 100]) {
    let c = applyQuick("rain", defaultConfig("rain"), "storm");
    for (const [cid, k, v] of [["thunder", "power", power], ["thunder", "distance", 75], ["thunder", "frequency", 45], ["wind", "on", false]]) c = setParam("rain", c, cid, k, v);
    const row = {};
    // "orecchio": pesatura K; "telefono": in più si toglie ciò che sta sotto i 150 Hz,
    // che l'altoparlante di un telefono non riproduce
    for (const [name, phone] of [["orecchioDb", false], ["telefonoDb", true]]) {
      const { out } = await render(c, 40, { viaGraph: true, volume: 0.7, kWeight: true, phone });
      const L = out.getChannelData(0), lv = [];
      for (let i = SR * 2; i + SR / 2 <= L.length; i += SR / 4) { let q = 0; for (let j = i; j < i + SR / 2; j++) q += L[j] * L[j]; lv.push(db(Math.sqrt(q / (SR / 2)))); }
      const sorted = [...lv].sort((a, b) => a - b);
      row[name] = +(sorted[sorted.length - 1] - sorted[Math.floor(sorted.length * 0.3)]).toFixed(1);
    }
    res["potenza " + power] = row;
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
