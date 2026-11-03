// Grafo audio di Onde Quiete, separato dal componente React così si può costruire
// anche in un OfflineAudioContext per le misure (ticket OQ-10).
//
//   oscillatore sinistro ─ pan −1 ┐
//   oscillatore destro  ─ pan +1 ┴─ toneGain ──┐
//   sorgente rumore (slot, dissolvenze) ─ noiseGain ──┼─ master ─ destinazione
//   sorgente natura (slot, dissolvenze) ─ natureGain ─┘

import { createSlot } from "./crossfade.js";

// livello massimo di ogni componente a cursore 100%
export const COMPONENT_GAIN = { tone: 0.35, noise: 0.5, nature: 0.8 };

export function createGraph(ctx, destination) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(destination);

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
    ctx, master, toneGain, noiseGain, natureGain, oscL, oscR,
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
