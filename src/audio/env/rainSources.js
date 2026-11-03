// Sorgenti sonore dell'ambiente Pioggia (NAT-03), sintetizzate a blocchi.
//
// Pioggia: tre strati di gocce con densità e carattere diversi, più un fondo d'acqua
// filtrato dal vivo. L'intensità dosa gli strati e i filtri: non è solo un volume.
// Tuoni: varianti di rimbombo (frequenza di campionamento ridotta: sono suoni gravi)
// e di schiocco; distanza e tempo di arrivo si decidono quando il tuono viene suonato.

import { YIELD_EVERY, foldLoop, softLimit, runAsync } from "../bufferTools.js";
import { seededRandom } from "./scheduler.js";

const LOOP_S = 8;
const FADE_S = 0.08;

function* stereoLoop(ctx, seconds, fill, seed, { rmsTarget = null, peakTarget = 0.7 } = {}) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fade = Math.floor(sr * FADE_S);
  const chans = [];
  for (let ch = 0; ch < 2; ch++) {
    const rng = seededRandom(seed * 7919 + ch * 104729 + 1);
    const raw = new Float32Array(len + fade);
    yield* fill(raw, sr, rng);
    const d = new Float32Array(len);
    foldLoop(raw, len, fade, d);
    chans.push(d);
    yield;
  }
  // normalizzazione: a livello medio (gli strati si dosano tra loro) o di picco
  let peak = 0, sum = 0;
  for (const d of chans) {
    for (let i = 0; i < len; i++) {
      if ((i & (YIELD_EVERY - 1)) === 0) yield;
      const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i];
    }
  }
  const rms = Math.sqrt(sum / (2 * len));
  const k = rmsTarget ? rmsTarget / (rms || 1) : peakTarget / (peak || 1);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = chans[ch];
    for (let i = 0; i < len; i++) {
      if ((i & (YIELD_EVERY - 1)) === 0) yield;
      d[i] = softLimit(d[i] * k, 0.8);
    }
    buf.copyToChannel(d, ch);
  }
  return buf;
}

// ── rumore bianco: materia prima del fondo d'acqua e del vento ───────────
function* whiteFill(out, sr, rng) {
  for (let i = 0; i < out.length; i++) {
    if ((i & (YIELD_EVERY - 1)) === 0) yield;
    out[i] = rng() * 2 - 1;
  }
}

// ── gocce ────────────────────────────────────────────────────────────────
// Ogni goccia è un breve impulso di rumore con attacco arrotondato (niente clic secchi),
// coda di pochi millisecondi e un colore leggermente diverso dalle altre.
// Più voci si sovrappongono, come gocce vere che cadono insieme.
// Niente note intonate: sommate a tante gocce davano un timbro metallico (misura in report).
const DROP_LAYERS = {
  // pioggia leggera: ticchettio fitto e morbido, non scoppiettii isolati
  // hp: quanto si tolgono i bassi; senza, le gocce leggere sembravano piccoli tonfi (crepitio da camino)
  light: { seconds: 12, perSec: 220, amp: [0.25, 0.6], attack: 0.0006, decay: [0.002, 0.006], lp: [0.18, 0.45], hp: 0.3, voices: 6 },
  mid: { seconds: 10, perSec: 900, amp: [0.2, 0.6], attack: 0.0004, decay: [0.0015, 0.004], lp: [0.25, 0.55], hp: 0.22, voices: 8 },
  // scroscio: gocce fittissime e un velo d'acqua continuo
  heavy: { seconds: 8, perSec: 2600, amp: [0.2, 0.5], attack: 0.0003, decay: [0.001, 0.003], lp: [0.3, 0.65], hp: 0.12, voices: 10, sheet: 0.4 },
};

const DROP_YIELD = 4096;

function dropFill(layer) {
  const L = DROP_LAYERS[layer];
  return function* (out, sr, rng) {
    const voices = Array.from({ length: L.voices }, () => ({ target: 0, env: 0, dec: 0, lp: 0, lpS: 0, hpS: 0, hpS2: 0 }));
    const attackK = 1 - Math.exp(-1 / (sr * L.attack));
    let next = 0, sheetLp = 0;
    const p = L.perSec / sr;
    const n = out.length;
    for (let i = 0; i < n; i++) {
      // le gocce costano più del rumore semplice (un filtro per voce): blocchi più piccoli
      if ((i & (DROP_YIELD - 1)) === 0) yield;
      if (rng() < p) {
        const v = voices[next];
        next = (next + 1) % voices.length;
        v.target = L.amp[0] + (L.amp[1] - L.amp[0]) * rng();
        v.dec = Math.exp(-1 / (sr * (L.decay[0] + rng() * (L.decay[1] - L.decay[0]))));
        v.lp = L.lp[0] + (L.lp[1] - L.lp[0]) * rng();
      }
      let sum = 0;
      for (const v of voices) {
        if (v.target > 0) {
          v.env += (v.target - v.env) * attackK;
          if (v.env >= v.target * 0.95) v.target = 0; // fine dell'attacco, inizia la coda
        } else {
          v.env *= v.dec;
        }
        if (v.env < 1e-5) continue;
        const w = rng() * 2 - 1;
        // due passa-alto in serie (12 dB/ottava): la goccia è un suono acuto, senza tonfo
        v.hpS += L.hp * (w - v.hpS);
        const h1 = w - v.hpS;
        v.hpS2 += L.hp * (h1 - v.hpS2);
        v.lpS += v.lp * (h1 - v.hpS2 - v.lpS); // ammorbidisce gli acuti estremi
        sum += v.lpS * v.env;
      }
      if (L.sheet) {
        // velo d'acqua della pioggia battente, che "ondeggia" lentamente
        sheetLp += 0.35 * ((rng() * 2 - 1) - sheetLp);
        sum += sheetLp * L.sheet * (0.75 + 0.25 * Math.sin((2 * Math.PI * 3 * i) / n));
      }
      out[i] = sum;
    }
  };
}

// ── tuoni ────────────────────────────────────────────────────────────────
function* rumbleFill(out, sr, rng) {
  const n = out.length;
  // più scoppi in successione, ognuno con attacco e coda: il tuono "rotola"
  const bursts = [];
  let t = 0;
  const count = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < count; k++) {
    bursts.push({ at: t, amp: k === 0 ? 1 : 0.35 + 0.5 * rng(), attack: 0.08 + 0.4 * rng(), tau: 1.2 + 2.5 * rng() });
    t += 0.5 + 2.2 * rng();
  }
  let a1 = 0, a2 = 0, b1 = 0;
  for (let i = 0; i < n; i++) {
    if ((i & (YIELD_EVERY - 1)) === 0) yield;
    const w = rng() * 2 - 1;
    a1 += 0.05 * (w - a1);
    a2 += 0.05 * (a1 - a2); // molto grave
    b1 += 0.18 * (w - b1); // un po' di medi, la "voce" del tuono
    const x = i / sr;
    let env = 0;
    for (const b of bursts) {
      const dx = x - b.at;
      if (dx < 0) continue;
      env += b.amp * Math.min(1, dx / b.attack) * Math.exp(-dx / b.tau);
    }
    const roll = 0.7 + 0.3 * Math.sin(2 * Math.PI * x * (0.6 + 0.4 * bursts.length / 4));
    const tailFade = Math.min(1, (n - i) / (sr * 0.6));
    out[i] = (a2 * 14 + b1 * 1.6) * env * roll * tailFade;
  }
}

// schiocco del fulmine vicino: attacco istantaneo, coda breve e un secondo colpo ravvicinato
function* crackFill(out, sr, rng) {
  const tau = 0.04 + 0.05 * rng();
  const second = 0.03 + 0.06 * rng();
  let hp = 0;
  for (let i = 0; i < out.length; i++) {
    if ((i & (YIELD_EVERY - 1)) === 0) yield;
    const x = i / sr;
    const w = rng() * 2 - 1;
    hp += 0.2 * (w - hp);
    const env = Math.min(1, x / 0.002) * Math.exp(-x / tau) + (x > second ? 0.5 * Math.exp(-(x - second) / 0.08) : 0);
    out[i] = (w - hp * 0.5) * env;
  }
}

function* monoBuffer(ctx, seconds, sampleRate, fill, seed) {
  const len = Math.floor(sampleRate * seconds);
  const d = new Float32Array(len);
  yield* fill(d, sampleRate, seededRandom(seed));
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
  const k = 0.9 / (peak || 1);
  for (let i = 0; i < len; i++) d[i] *= k;
  const buf = ctx.createBuffer(1, len, sampleRate);
  buf.copyToChannel(d, 0);
  return buf;
}

export const THUNDER_VARIANTS = 4;
export const CRACK_VARIANTS = 3;

/** Tutte le sorgenti della Pioggia. Ogni voce è una funzione che restituisce una Promise. */
export function rainSources(ctx) {
  return {
    // due rumori indipendenti: il fondo della pioggia e il vento non devono condividere
    // la stessa materia prima (sommata a velocità diverse darebbe un timbro metallico)
    white: () => runAsync(stereoLoop(ctx, LOOP_S, whiteFill, 11, { rmsTarget: 0.2 })),
    windNoise: () => runAsync(stereoLoop(ctx, 9, whiteFill, 12, { rmsTarget: 0.2 })),
    // strati di lunghezza diversa (12, 10, 8 s): insieme si ripetono solo ogni 2 minuti
    drops: (layer) => runAsync(stereoLoop(ctx, DROP_LAYERS[layer].seconds, dropFill(layer), { light: 21, mid: 22, heavy: 23 }[layer], { rmsTarget: 0.12 })),
    rumble: (v) => runAsync(monoBuffer(ctx, 10 + (v % 2) * 3, 22050, rumbleFill, 100 + v)),
    crack: (v) => runAsync(monoBuffer(ctx, 0.7, ctx.sampleRate, crackFill, 200 + v)),
  };
}
