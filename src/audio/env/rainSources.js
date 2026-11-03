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
// Una goccia d'acqua che cade su foglie, terra o tetto è un "pat" morbido: un breve soffio
// di rumore con attacco di 1–3 ms, coda di 8–40 ms e colore medio (1–5 kHz).
// Le versioni precedenti usavano impulsi di 1–6 ms molto acuti: all'ascolto sembravano
// granelli duri, cioè grandine. Ogni goccia ha distanza casuale: le lontane (la maggior parte)
// sono deboli e più scure, le vicine più forti e un po' più chiare.
//
// perSec: gocce al secondo · decay: coda (s) · tone: taglio alto (Hz) dalle lontane alle vicine
// hp: taglio basso (Hz), toglie il tonfo · voices: gocce che possono suonare insieme
export const DROP_LAYERS = {
  light: { seconds: 12, perSec: 160, decay: [0.012, 0.04], attack: [0.0015, 0.003], tone: [1300, 4200], hp: 650, voices: 14 },
  mid: { seconds: 10, perSec: 650, decay: [0.008, 0.026], attack: [0.001, 0.0025], tone: [1500, 4800], hp: 450, voices: 22 },
  // scroscio: tantissime gocce sovrapposte e un velo d'acqua continuo
  heavy: { seconds: 8, perSec: 1800, decay: [0.006, 0.018], attack: [0.001, 0.002], tone: [1600, 5200], hp: 250, voices: 28, sheet: 0.35 },
};

const DROP_YIELD = 2048;
const onePole = (hz, sr) => 1 - Math.exp((-2 * Math.PI * hz) / sr);

function dropFill(layer) {
  const L = DROP_LAYERS[layer];
  return function* (out, sr, rng) {
    const voices = Array.from({ length: L.voices }, () => ({ env: 0, peak: 0, atk: 0, rising: false, dec: 0, lp: 0, l1: 0, l2: 0, h1: 0, h2: 0 }));
    const hpK = onePole(L.hp, sr);
    let next = 0, sheetLp = 0, sheetHp = 0;
    const p = L.perSec / sr;
    const n = out.length;
    for (let i = 0; i < n; i++) {
      if ((i & (DROP_YIELD - 1)) === 0) yield;
      if (rng() < p) {
        const v = voices[next];
        next = (next + 1) % voices.length;
        const near = rng() ** 2.2; // quasi tutte lontane: poche gocce spiccano
        v.peak = 0.15 + 0.85 * near;
        v.rising = true;
        v.atk = 1 / Math.max(1, sr * (L.attack[0] + rng() * (L.attack[1] - L.attack[0])));
        v.dec = Math.exp(-1 / (sr * (L.decay[0] + rng() * (L.decay[1] - L.decay[0]))));
        v.lp = onePole(L.tone[0] + (L.tone[1] - L.tone[0]) * (0.6 * near + 0.4 * rng()), sr);
      }
      let sum = 0;
      for (let k = 0; k < voices.length; k++) {
        const v = voices[k];
        if (v.rising) {
          // attacco a rampa morbida (quarto di seno approssimato)
          v.env += v.atk * v.peak;
          if (v.env >= v.peak) { v.env = v.peak; v.rising = false; }
        } else {
          if (v.env < 1e-4) continue;
          v.env *= v.dec;
        }
        const w = rng() * 2 - 1;
        // passa-basso a due poli (12 dB/ottava): la goccia è un "pat", non un "tic"
        v.l1 += v.lp * (w - v.l1);
        v.l2 += v.lp * (v.l1 - v.l2);
        // passa-alto a due poli: nessun tonfo nei bassi
        v.h1 += hpK * (v.l2 - v.h1);
        const a = v.l2 - v.h1;
        v.h2 += hpK * (a - v.h2);
        sum += (a - v.h2) * v.env;
      }
      if (L.sheet) {
        // velo d'acqua dello scroscio: rumore medio che "ondeggia" lentamente
        sheetLp += 0.3 * ((rng() * 2 - 1) - sheetLp);
        sheetHp += 0.02 * (sheetLp - sheetHp);
        sum += (sheetLp - sheetHp) * L.sheet * (0.75 + 0.25 * Math.sin((2 * Math.PI * 3 * i) / n));
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
    rumble: (v) => runAsync(monoBuffer(ctx, 13 + (v % 2) * 4, 22050, rumbleFill, 100 + v)),
    crack: (v) => runAsync(monoBuffer(ctx, 0.7, ctx.sampleRate, crackFill, 200 + v)),
  };
}
