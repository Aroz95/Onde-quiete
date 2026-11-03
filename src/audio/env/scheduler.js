// Pianificazione degli eventi degli ambienti (tuoni, raffiche, in seguito scoppiettii).
// Funzioni pure: ricevono il tempo e un generatore casuale, restituiscono i nuovi eventi.
// Così il comportamento si verifica con i test senza audio (NAT-02, NAT-06).
//
// Regole comuni:
//   - intervalli variabili attorno a una media, mai una sequenza a passo fisso
//   - distanza minima tra due inizi e numero massimo di eventi sovrapposti
//   - si pianifica solo fino a un orizzonte: alla ripresa dopo una pausa si riparte da "adesso",
//     senza recuperare gli eventi che sarebbero caduti nella pausa

/** Generatore casuale ripetibile (per i test e le misure). */
export function seededRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Stato di una sequenza di eventi: { nextAt, events: [{ start, end }] }.
 * `nextAt` è il primo istante utile per il prossimo evento.
 */
export function startSequence(now, { firstDelay }, rng) {
  return { nextAt: now + firstDelay(rng), events: [] };
}

/**
 * Pianifica eventi fino a `until`. `rule`:
 *   interval(rng)  → secondi fino al prossimo inizio
 *   duration(rng)  → durata di un evento
 *   minGap         → distanza minima tra due inizi
 *   maxOverlap     → eventi contemporanei al massimo (se pieno si aspetta che uno finisca)
 * Restituisce { state, added } senza modificare lo stato ricevuto.
 */
export function planUntil(state, until, rule, rng) {
  const events = state.events.slice();
  const added = [];
  let t = state.nextAt;
  let guard = 0;
  while (t < until && guard++ < 1000) {
    // rispetta il limite di sovrapposizione: si sposta l'inizio alla fine del primo che termina
    const active = events.filter((e) => e.end > t).sort((a, b) => a.end - b.end);
    if (active.length >= rule.maxOverlap) {
      t = active[active.length - rule.maxOverlap].end + 0.01;
      continue;
    }
    const ev = { start: t, end: t + rule.duration(rng) };
    events.push(ev);
    added.push(ev);
    t = t + Math.max(rule.minGap, rule.interval(rng));
  }
  return { state: { nextAt: t, events: events.filter((e) => e.end > until - 600) }, added };
}

/** Annulla gli eventi non ancora iniziati: restano solo quelli già partiti prima di `now`. */
export function cancelFuture(state, now) {
  const kept = state.events.filter((e) => e.start <= now);
  return { state: { nextAt: Infinity, events: kept }, cancelled: state.events.filter((e) => e.start > now) };
}

// ── regole per componente ─────────────────────────────────────────────────

const lerpLog = (a, b, x) => a * (b / a) ** x;

/** Tuoni: `frequency` 0–1 (rari → frequenti). Media da 110 s a 14 s. */
export function thunderRule(frequency) {
  const mean = lerpLog(110, 14, frequency);
  return {
    mean,
    interval: (rng) => mean * (0.4 + 1.2 * rng()),
    duration: (rng) => 9 + 5 * rng(), // la coda del tuono
    minGap: 6,
    maxOverlap: 2,
    // il primo tuono arriva presto, così chi lo attiva lo sente
    firstDelay: (rng) => 2 + rng() * Math.min(10, 0.3 * mean),
  };
}

/** Raffiche di vento: `gusts` 0–1 (rare → frequenti). Una alla volta, mai sovrapposte. */
export function gustRule(gusts) {
  const mean = lerpLog(28, 6, gusts);
  return {
    mean,
    interval: (rng) => mean * (0.5 + rng()),
    duration: (rng) => 3.5 + 6 * rng(), // salita, tenuta e discesa
    minGap: 4,
    maxOverlap: 1,
    firstDelay: (rng) => 1 + rng() * Math.min(6, 0.4 * mean),
  };
}
