// Strumenti comuni per generare i buffer dei suoni (ticket OQ-10).

/** Ogni quanti campioni un generatore cede il controllo (circa 0,3 s di audio a 48 kHz). */
export const YIELD_EVERY = 16384;

/**
 * Chiude il loop senza click: gli ultimi `fade` campioni generati in più vengono sfumati
 * sopra i primi, così la fine del buffer si raccorda con l'inizio.
 */
export function foldLoop(raw, len, fade, out) {
  out.set(raw.subarray(0, len)); // copia nativa, molto più rapida di un ciclo
  for (let i = 0; i < fade; i++) out[i] = raw[i] * (i / fade) + raw[len + i] * (1 - i / fade);
}

/**
 * Limitatore morbido: sotto `knee` il segnale passa intatto, sopra viene arrotondato
 * e non supera mai 1. Serve a tenere bassi i picchi (scoppiettii, schiocchi dei tuoni)
 * quando si alza il livello di un suono.
 */
export function softLimit(x, knee = 0.7) {
  const a = Math.abs(x);
  if (a <= knee) return x;
  const room = 1 - knee;
  return Math.sign(x) * (knee + room * Math.tanh((a - knee) / room));
}

/** Esegue un generatore fino in fondo, tutto subito. */
export function runSync(gen) {
  let r = gen.next();
  while (!r.done) r = gen.next();
  return r.value;
}

/**
 * Esegue un generatore a piccoli blocchi (al massimo `budgetMs` per volta),
 * lasciando respirare l'interfaccia tra un blocco e l'altro.
 */
export function runAsync(gen, budgetMs = 8) {
  return new Promise((resolve, reject) => {
    const step = () => {
      try {
        const t0 = performance.now();
        let r;
        do { r = gen.next(); } while (!r.done && performance.now() - t0 < budgetMs);
        if (r.done) resolve(r.value);
        else setTimeout(step, 0);
      } catch (e) {
        reject(e);
      }
    };
    // primo blocco in un turno a parte: chi chiede il buffer (spesso un clic che aggiorna
    // anche l'interfaccia) non somma il proprio lavoro a quello della generazione
    setTimeout(step, 0);
  });
}
