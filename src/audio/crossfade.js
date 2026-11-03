// Dissolvenze incrociate tra sorgenti in loop (ticket OQ-03).
//
// Ogni sorgente passa da due guadagni dedicati:  sorgente → ingresso → uscita → destinazione.
// Il guadagno d'ingresso viene programmato una volta sola (alla nascita) e quello d'uscita
// una volta sola (quando la sorgente viene sostituita). Così le automazioni non si
// sovrappongono mai, anche se si cambia suono a metà di una dissolvenza.
//
// Le curve sono a potenza costante (seno/coseno): con rumori non correlati il volume
// percepito resta stabile durante il passaggio, senza buchi e senza picchi.

export const CROSSFADE_S = 0.8;
const STEPS = 128;

const curves = {};
export function fadeCurve(direction) {
  if (!curves[direction]) {
    const c = new Float32Array(STEPS);
    for (let i = 0; i < STEPS; i++) {
      const x = (i / (STEPS - 1)) * (Math.PI / 2);
      c[i] = direction === "in" ? Math.sin(x) : Math.cos(x);
    }
    curves[direction] = c;
  }
  return curves[direction];
}

/** Un "posto" per una sorgente che può essere sostituita (es. il rumore, la natura). */
export function createSlot(ctx, destination) {
  return { ctx, destination, current: null, fading: new Set() };
}

function fadeOut(slot, layer, at, fade) {
  slot.fading.add(layer);
  layer.src.onended = () => {
    try { layer.src.disconnect(); layer.inGain.disconnect(); layer.outGain.disconnect(); } catch { /* già scollegato */ }
    slot.fading.delete(layer);
  };
  if (fade) {
    layer.outGain.gain.setValueCurveAtTime(fadeCurve("out"), at, CROSSFADE_S);
    layer.src.stop(at + CROSSFADE_S + 0.05);
  } else {
    layer.src.stop(at);
  }
}

/**
 * Sostituisce la sorgente del posto con un nuovo buffer in loop (o la toglie con `null`).
 * Con `fade: true` il nuovo suono entra in dissolvenza, anche se prima il posto era vuoto
 * (es. un suono della natura pronto solo dopo l'avvio). Con `fade: false` il cambio è
 * immediato: si usa al primo avvio, quando il volume generale sta già salendo da zero.
 */
export function switchSource(slot, buffer, { fade = true } = {}) {
  const { ctx } = slot;
  const at = ctx.currentTime;
  const old = slot.current;
  slot.current = null;

  if (buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const inGain = ctx.createGain();
    const outGain = ctx.createGain();
    if (fade) {
      inGain.gain.value = 0; // valore di partenza, poi la curva
      inGain.gain.setValueCurveAtTime(fadeCurve("in"), at, CROSSFADE_S);
    }
    src.connect(inGain).connect(outGain).connect(slot.destination);
    // partenza da un punto casuale del loop: la ripetizione si riconosce meno
    src.start(at, Math.random() * buffer.duration);
    slot.current = { src, inGain, outGain };
  }

  if (old) fadeOut(slot, old, at, fade);
}

/** Quante sorgenti sono ancora collegate (quella attiva più quelle in uscita). */
export function liveSources(slot) {
  return (slot.current ? 1 : 0) + slot.fading.size;
}
