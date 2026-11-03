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
// Un tuono vero: un colpo principale, poi una serie irregolare di rimbombi che "rotolano",
// con un tremolio rapido e disordinato (il brontolio). L'energia sta soprattutto tra 50 e 300 Hz,
// con una "voce" più ruvida fino a ~800 Hz. La versione precedente aveva quasi tutta l'energia
// sotto i 60 Hz: telefoni e auricolari non la riproducono, e il tuono sembrava senza bassi.

// filtro passa-banda a variabili di stato (stabile alle basse frequenze)
function bandpass(hz, q, sr) {
  const f = 2 * Math.sin((Math.PI * hz) / sr);
  let low = 0, band = 0;
  return (x) => { low += f * band; const high = x - low - band / q; band += f * high; return band; };
}

function* rumbleFill(out, sr, rng) {
  const n = out.length;
  const bursts = [{ at: 0, amp: 1, attack: 0.04 + 0.08 * rng(), tau: 0.9 + 0.9 * rng() }];
  let t = 0.25 + 0.5 * rng();
  const count = 3 + Math.floor(rng() * 4);
  for (let k = 0; k < count; k++) {
    bursts.push({ at: t, amp: (0.35 + 0.55 * rng()) * (1 - 0.08 * k), attack: 0.08 + 0.35 * rng(), tau: 0.7 + 1.8 * rng() });
    t += 0.4 + 1.6 * rng();
  }
  const deep = bandpass(62 + 20 * rng(), 0.8, sr); // il fondo del rombo
  const body = bandpass(140 + 50 * rng(), 0.9, sr); // il corpo, che si sente anche su un telefono
  const growl = bandpass(380 + 160 * rng(), 0.8, sr); // la voce ruvida del brontolio
  // tremolio disordinato: un valore casuale che cambia 3–14 volte al secondo, smussato
  let rattle = 0.5, target = 0.5, nextChange = 0;
  const smooth = 1 - Math.exp(-1 / (sr * 0.025));
  for (let i = 0; i < n; i++) {
    if ((i & (YIELD_EVERY - 1)) === 0) yield;
    if (i >= nextChange) { target = rng(); nextChange = i + Math.floor(sr / (3 + 11 * rng())); }
    rattle += smooth * (target - rattle);
    const x = i / sr;
    let env = 0;
    for (const b of bursts) {
      const dx = x - b.at;
      if (dx < 0) continue;
      env += b.amp * Math.min(1, dx / b.attack) * Math.exp(-dx / b.tau);
    }
    env += 0.22 * Math.min(1, x / 0.6) * Math.exp(-x / 5); // coda lunga che si allontana
    const w = rng() * 2 - 1;
    const tailFade = Math.min(1, (n - i) / (sr * 0.6));
    const v = deep(w) * 1.1 * (0.8 + 0.2 * rattle) + body(w) * 1.0 * (0.55 + 0.45 * rattle) + growl(w) * 0.55 * (0.3 + 0.7 * rattle);
    out[i] = v * env * tailFade;
  }
}

// schiocco del fulmine vicino: una lacerazione di piccoli crepitii, poi il colpo secco
function* crackFill(out, sr, rng) {
  const tear = 0.12 + 0.35 * rng(); // durata della lacerazione prima del colpo
  const ticks = [];
  for (let k = 0, at = 0; k < 6 + Math.floor(rng() * 8); k++) { ticks.push({ at, amp: 0.25 + 0.5 * rng() * (at / tear) }); at += (tear / 8) * (0.4 + 1.2 * rng()); }
  const tau = 0.05 + 0.06 * rng();
  let hp = 0;
  for (let i = 0; i < out.length; i++) {
    if ((i & (YIELD_EVERY - 1)) === 0) yield;
    const x = i / sr;
    const w = rng() * 2 - 1;
    hp += 0.15 * (w - hp);
    let env = 0;
    for (const tk of ticks) { const dx = x - tk.at; if (dx >= 0 && dx < 0.05) env += tk.amp * Math.exp(-dx / 0.006); }
    const dx = x - tear;
    if (dx >= 0) env += Math.min(1, dx / 0.002) * Math.exp(-dx / tau) + 0.4 * Math.exp(-dx / 0.25);
    out[i] = (w - hp * 0.6) * env;
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
    crack: (v) => runAsync(monoBuffer(ctx, 1.4, ctx.sampleRate, crackFill, 200 + v)),
  };
}
