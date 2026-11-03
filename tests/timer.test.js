// Test del timer a tempo controllato (OQ-01). Si eseguono con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTimer, resumeTimer, pauseTimer, setTimerDuration, finishTimer,
  timerRemaining, timerExpired, formatRemaining,
} from "../src/timer.js";

const MIN = 60000;

test("25 minuti, pausa dopo 10: la ripresa offre 15 minuti", () => {
  let t = setTimerDuration(createTimer(), 25, 0, false);
  t = resumeTimer(t, 0);
  t = pauseTimer(t, 10 * MIN);
  assert.equal(timerRemaining(t, 10 * MIN), 15 * MIN);
  t = resumeTimer(t, 10 * MIN);
  assert.equal(timerRemaining(t, 10 * MIN), 15 * MIN);
});

test("il tempo passato in pausa non riduce il residuo", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 25, 0, false), 0);
  t = pauseTimer(t, 10 * MIN);
  // un'ora di pausa
  assert.equal(timerRemaining(t, 70 * MIN), 15 * MIN);
  assert.equal(timerExpired(t, 70 * MIN), false);
  t = resumeTimer(t, 70 * MIN);
  assert.equal(timerRemaining(t, 70 * MIN), 15 * MIN);
  assert.equal(timerExpired(t, 85 * MIN - 1), false);
  assert.equal(timerExpired(t, 85 * MIN), true);
});

test("pause e riprese ripetute sommano solo il tempo di ascolto", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 10, 0, false), 0);
  t = pauseTimer(t, 2 * MIN); // ascoltati 2
  t = resumeTimer(t, 5 * MIN);
  t = pauseTimer(t, 8 * MIN); // ascoltati 3, totale 5
  t = resumeTimer(t, 20 * MIN);
  assert.equal(timerRemaining(t, 20 * MIN), 5 * MIN);
});

test("una doppia ripresa non sposta la scadenza", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 10, 0, false), 0);
  const end = t.endAt;
  t = resumeTimer(t, 3 * MIN); // es. tocco su un preset mentre suona
  assert.equal(t.endAt, end);
});

test("una pausa a timer fermo non cambia nulla", () => {
  const t = setTimerDuration(createTimer(), 10, 0, false);
  assert.deepEqual(pauseTimer(t, 5 * MIN), t);
});

test("una nuova durata sostituisce il residuo, anche mentre suona", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 25, 0, false), 0);
  t = setTimerDuration(t, 45, 10 * MIN, true);
  assert.equal(timerRemaining(t, 10 * MIN), 45 * MIN);
  assert.equal(t.endAt, 55 * MIN);
});

test("una nuova durata scelta in pausa parte alla ripresa", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 25, 0, false), 0);
  t = pauseTimer(t, 10 * MIN);
  t = setTimerDuration(t, 10, 12 * MIN, false);
  assert.equal(t.endAt, null);
  assert.equal(timerRemaining(t, 30 * MIN), 10 * MIN);
  t = resumeTimer(t, 30 * MIN);
  assert.equal(t.endAt, 40 * MIN);
});

test("una durata scelta ad audio fermo non crea una sessione in pausa", () => {
  let t = setTimerDuration(createTimer(), 25, 0, false);
  assert.equal(timerRemaining(t, 0), null); // nessun "in pausa"
  t = resumeTimer(t, 5 * MIN);
  assert.equal(timerRemaining(t, 5 * MIN), 25 * MIN);
});

test("'No' disattiva il timer senza scadenze", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 25, 0, false), 0);
  t = setTimerDuration(t, 0, 5 * MIN, true);
  assert.equal(t.durationMin, 0);
  assert.equal(timerRemaining(t, 5 * MIN), null);
  assert.equal(timerExpired(t, 999 * MIN), false);
  assert.equal(resumeTimer(t, 6 * MIN).endAt, null);
});

test("a scadenza la sessione si chiude e il nuovo avvio usa la durata intera", () => {
  let t = resumeTimer(setTimerDuration(createTimer(), 25, 0, false), 0);
  assert.equal(timerExpired(t, 25 * MIN), true);
  t = finishTimer(t);
  assert.equal(t.durationMin, 25);
  assert.equal(timerRemaining(t, 30 * MIN), null);
  t = resumeTimer(t, 40 * MIN);
  assert.equal(timerRemaining(t, 40 * MIN), 25 * MIN);
});

test("il residuo non diventa mai negativo", () => {
  const t = resumeTimer(setTimerDuration(createTimer(), 10, 0, false), 0);
  assert.equal(timerRemaining(t, 99 * MIN), 0);
  assert.equal(pauseTimer(t, 99 * MIN).remainingMs, 0);
});

test("formato del conto alla rovescia", () => {
  assert.equal(formatRemaining(null), "");
  assert.equal(formatRemaining(15 * MIN), "15:00");
  assert.equal(formatRemaining(61_500), "1:02");
  assert.equal(formatRemaining(60 * MIN), "1:00:00");
});
