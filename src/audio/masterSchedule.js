// Programmazione del volume generale nel clock audio (ticket OQ-02).
//
// Lo spegnimento del timer viene scritto direttamente nella "timeline" del Web Audio:
// il motore audio lo esegue all'istante giusto anche se il JavaScript della pagina
// è rallentato o sospeso (schermo bloccato, app in background). Il JavaScript serve poi
// solo a riconciliare lo stato dell'interfaccia quando torna attivo.

/** Durata della dissolvenza finale prima della scadenza del timer, in secondi. */
export const FINAL_FADE_S = 8;

/**
 * Porta il volume generale a `volume` (0–1) e, se c'è una scadenza (`endAudio`, in secondi
 * del clock audio), programma la dissolvenza finale che arriva a zero alla scadenza.
 * Cancella ogni programmazione futura precedente, quindi si può richiamare a ogni modifica.
 */
export function scheduleMaster(param, now, volume, endAudio = null, tau = 0.2) {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(volume, now, tau);
  if (endAudio != null) {
    const start = Math.max(now, endAudio - FINAL_FADE_S);
    // costante di tempo = un quarto della durata: a scadenza il volume è sotto il 2%
    param.setTargetAtTime(0, start, Math.max(0.05, (endAudio - start) / 4));
  }
}

/** Converte una scadenza in millisecondi di orologio nel tempo del clock audio. */
export function wallToAudio(endAtMs, nowMs, audioNow) {
  return audioNow + Math.max(0, endAtMs - nowMs) / 1000;
}
