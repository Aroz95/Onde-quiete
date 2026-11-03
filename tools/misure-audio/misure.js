import { makeNatureBuffer } from "../../src/audio/natureSounds.js";
import { makeNoiseBuffer } from "../../src/audio/noiseSounds.js";
import { createGraph, applyParams } from "../../src/audio/graph.js";
import { switchSource } from "../../src/audio/crossfade.js";
import { PRESETS } from "../../src/presets.js";
const SR = 48000;
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

function bufferStats(buf) {
  const out = { ch: [] };
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c); let peak = 0, sum = 0;
    const steps = new Float32Array(d.length - 1);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; if (i) steps[i - 1] = Math.abs(d[i] - d[i - 1]); }
    const sorted = Float32Array.from(steps).sort();
    const p999 = sorted[Math.floor(sorted.length * 0.999)], median = sorted[Math.floor(sorted.length / 2)];
    const jump = Math.abs(d[0] - d[d.length - 1]);
    // posizione del salto alla giunzione nella distribuzione dei salti normali
    let rank = 0; { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < jump) lo = m + 1; else hi = m; } rank = lo / sorted.length; }
    out.ch.push({ peak, rms: Math.sqrt(sum / d.length), jump, jumpVsMedian: jump / median, jumpVsP999: jump / p999, percentile: rank });
  }
  return out;
}

window.buffers = async () => {
  const ctx = new OfflineAudioContext(2, SR, SR); const res = {};
  for (const [kind, gen, types] of [["natura", makeNatureBuffer, ["rain", "waves", "wind", "fire", "storm"]], ["rumore", makeNoiseBuffer, ["pink", "brown", "white"]]]) {
    for (const t of types) {
      const t0 = performance.now(); const b = gen(ctx, t); const ms = performance.now() - t0;
      const st = bufferStats(b);
      res[kind + " " + t] = { ms: Math.round(ms), secondi: b.duration, MB: +(b.length * b.numberOfChannels * 4 / 1e6).toFixed(1),
        crestDb: +(db(Math.max(...st.ch.map((c) => c.peak))) - db(st.ch[0].rms)).toFixed(1),
        giunzione: st.ch.map((c) => ({ salto: +c.jump.toFixed(3), suMediana: +c.jumpVsMedian.toFixed(1), suP999: +c.jumpVsP999.toFixed(2), percentile: +(c.percentile * 100).toFixed(2) })) };
    }
  }
  return res;
};

// rende il mix completo di un preset con il grafo dell'app
async function renderPreset(p, volume, seconds) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  const g = createGraph(ctx, ctx.destination);
  applyParams(g, p);
  g.toneGain.gain.value = (p.tone / 100) * 0.35; g.noiseGain.gain.value = (p.noise / 100) * 0.5; g.natureGain.gain.value = (p.nature / 100) * 0.8;
  g.oscL.frequency.value = p.car; g.oscR.frequency.value = p.car + p.beat;
  g.master.gain.value = volume;
  switchSource(g.noiseSlot, makeNoiseBuffer(ctx, p.noiseType), { fade: false });
  switchSource(g.natureSlot, makeNatureBuffer(ctx, p.natureType), { fade: false });
  return ctx.startRendering();
}
window.mix = async () => {
  const res = {};
  for (const p of PRESETS) {
    const secs = p.natureType === "storm" && p.nature > 0 ? 46 : 21;
    const row = { };
    for (const vol of [0.7, 1]) {
      const out = await renderPreset(p, vol, secs);
      let peak = 0, sum = 0, clip = 0, n = 0;
      for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = SR; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 1) clip++; sum += d[i] * d[i]; n++; } }
      row[vol === 1 ? "max" : "def"] = { picco: +db(peak).toFixed(1), rms: +db(Math.sqrt(sum / n)).toFixed(1), saturati: clip };
    }
    res[p.id] = row;
  }
  return res;
};
// canali del binaurale: frequenza a sinistra e a destra (solo tono)
window.channels = async () => {
  const p = { ...PRESETS.find((x) => x.id === "relax"), noise: 0, nature: 0 };
  const out = await renderPreset(p, 1, 3);
  const freq = (d) => { let z = 0; for (let i = SR + 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) z++; return z / ((d.length - SR) / SR); };
  return { sinistra: +freq(out.getChannelData(0)).toFixed(1), destra: +freq(out.getChannelData(1)).toFixed(1), attesi: [p.car, p.car + p.beat] };
};

// loudness con pesatura K (ITU-R BS.1770), senza gating: buona per confrontare i preset tra loro
async function loudness(p, volume, seconds) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  const shelf = ctx.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 1681; shelf.gain.value = 4;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5;
  shelf.connect(hp).connect(ctx.destination);
  const g = createGraph(ctx, shelf);
  g.toneGain.gain.value = (p.tone / 100) * 0.35; g.noiseGain.gain.value = (p.noise / 100) * 0.5; g.natureGain.gain.value = (p.nature / 100) * 0.8;
  g.oscL.frequency.value = p.car; g.oscR.frequency.value = p.car + p.beat; g.master.gain.value = volume;
  switchSource(g.noiseSlot, makeNoiseBuffer(ctx, p.noiseType), { fade: false });
  switchSource(g.natureSlot, makeNatureBuffer(ctx, p.natureType), { fade: false });
  const out = await ctx.startRendering();
  let ms = 0;
  for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); let s = 0; for (let i = SR; i < d.length; i++) s += d[i] * d[i]; ms += s / (d.length - SR); }
  return -0.691 + 10 * Math.log10(ms);
}
window.lufs = async (presets) => {
  const res = {};
  for (const p of presets || PRESETS) res[p.id] = +(await loudness(p, 0.7, p.natureType === "storm" && p.nature > 0 ? 46 : 21)).toFixed(1);
  return res;
};
