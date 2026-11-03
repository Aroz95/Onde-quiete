// Logica del timer di spegnimento, separata dall'interfaccia e senza orologio interno:
// ogni funzione riceve `now` (millisecondi), così si può testare a tempo controllato.
//
// Stato:
//   durationMin  durata scelta dall'utente (0 = timer disattivato)
//   remainingMs  tempo residuo della sessione corrente; null = nessuna sessione in corso
//   endAt        istante di scadenza mentre l'audio suona; null quando è in pausa o inattivo
//
// Regole (ticket OQ-01):
//   - la pausa congela il residuo; il tempo passato in pausa non lo consuma
//   - la ripresa ricostruisce la scadenza dal residuo
//   - cambiare preset o regolazioni non tocca il timer (nessuna funzione qui viene chiamata)
//   - scegliere una nuova durata sostituisce il residuo; "No" disattiva il timer senza fermare l'audio
//   - a scadenza la sessione si chiude: il prossimo avvio riparte dalla durata intera

const MIN = 60000;

export function createTimer(durationMin = 0) {
  return { durationMin, remainingMs: null, endAt: null };
}

/** Avvio o ripresa dell'ascolto. */
export function resumeTimer(t, now) {
  if (!t.durationMin) return { ...t, remainingMs: null, endAt: null };
  if (t.endAt != null) return t; // sta già scorrendo
  const remainingMs = t.remainingMs ?? t.durationMin * MIN;
  return { ...t, remainingMs, endAt: now + remainingMs };
}

/** Pausa dell'ascolto: congela il residuo. */
export function pauseTimer(t, now) {
  if (t.endAt == null) return t;
  return { ...t, remainingMs: Math.max(0, t.endAt - now), endAt: null };
}

/**
 * Nuova durata scelta dall'utente. Sostituisce il residuo:
 * se l'audio suona la nuova sessione parte subito, altrimenti alla prossima ripresa.
 */
export function setTimerDuration(t, durationMin, now, running) {
  if (!durationMin) return createTimer(0);
  const remainingMs = durationMin * MIN;
  if (running) return { durationMin, remainingMs, endAt: now + remainingMs };
  // in pausa: la nuova durata sostituisce il residuo della sessione sospesa
  if (t.remainingMs != null) return { durationMin, remainingMs, endAt: null };
  // nessuna sessione in corso: si memorizza solo la durata, la sessione nasce all'avvio
  return { durationMin, remainingMs: null, endAt: null };
}

/** Chiusura della sessione (a scadenza): mantiene la durata per la prossima volta. */
export function finishTimer(t) {
  return { ...t, remainingMs: null, endAt: null };
}

/** Millisecondi residui, oppure null se non c'è una sessione con timer. */
export function timerRemaining(t, now) {
  if (t.endAt != null) return Math.max(0, t.endAt - now);
  return t.remainingMs;
}

export function timerExpired(t, now) {
  return t.endAt != null && now >= t.endAt;
}

export function formatRemaining(ms) {
  if (ms == null) return "";
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
