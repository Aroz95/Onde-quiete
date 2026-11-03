// Grafo audio di Onde Quiete, separato dal componente React così si può costruire
// anche in un OfflineAudioContext per le misure (ticket OQ-10).
//
//   oscillatore sinistro ─ pan −1 ┐
//   oscillatore destro  ─ pan +1 ┴─ toneGain ──┐
//   sorgente rumore (slot, dissolvenze) ─ noiseGain ──┤
//   sorgente natura (slot, dissolvenze) ─ natureGain ─┼─ master ─ limitatore ─ destinazione
//   ambiente (Pioggia…, componenti)     ─ envBus ─────┘
//
// Il volume generale (master) e la dissolvenza finale agiscono su tutto il mix.
// Il limitatore interviene solo sui picchi vicini al massimo (tuoni vicini a volume alto).

import { createSlot } from "./crossfade.js";
import { softLimit } from "./bufferTools.js";

// livello massimo di ogni componente a cursore 100%
export const COMPONENT_GAIN = { tone: 0.35, noise: 0.5, nature: 0.8 };

const SAFETY_CURVE = (() => {
  const n = 2049, c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = 0.98 * softLimit(((i / (n - 1)) * 2 - 1) / 0.98, 0.8);
  return c;
})();

export function createGraph(ctx, destination) {
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 4;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.2;
  // dopo il limitatore, un arrotondamento morbido sopra l'80% della scala:
  // nessun campione può superare il massimo, la dinamica normale non viene toccata
  const clipper = ctx.createWaveShaper();
  clipper.curve = SAFETY_CURVE;
  clipper.oversample = "2x";
  master.connect(limiter).connect(clipper).connect(destination);

  const envBus = ctx.createGain();
  envBus.connect(master);

  const toneGain = ctx.createGain();
  const noiseGain = ctx.createGain();
  const natureGain = ctx.createGain();
  toneGain.connect(master);
  noiseGain.connect(master);
  natureGain.connect(master);

  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -1;
  panR.pan.value = 1;
  const oscL = ctx.createOscillator();
  const oscR = ctx.createOscillator();
  oscL.type = oscR.type = "sine";
  oscL.connect(panL).connect(toneGain);
  oscR.connect(panR).connect(toneGain);
  oscL.start();
  oscR.start();

  return {
    ctx, master, limiter, clipper, envBus, toneGain, noiseGain, natureGain, oscL, oscR,
    noiseSlot: createSlot(ctx, noiseGain),
    natureSlot: createSlot(ctx, natureGain),
  };
}

export function applyParams(n, { beat, car, tone, noise, nature }) {
  const t = n.ctx.currentTime;
  n.oscL.frequency.setTargetAtTime(car, t, 0.3);
  n.oscR.frequency.setTargetAtTime(car + beat, t, 0.3);
  n.toneGain.gain.setTargetAtTime((tone / 100) * COMPONENT_GAIN.tone, t, 0.3);
  n.noiseGain.gain.setTargetAtTime((noise / 100) * COMPONENT_GAIN.noise, t, 0.3);
  n.natureGain.gain.setTargetAtTime((nature / 100) * COMPONENT_GAIN.nature, t, 0.4);
}
