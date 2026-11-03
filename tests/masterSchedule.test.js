// Test della programmazione del volume nel clock audio (OQ-02).
import { test } from "node:test";
import assert from "node:assert/strict";
import { FINAL_FADE_S, scheduleMaster, wallToAudio } from "../src/audio/masterSchedule.js";

function fakeParam() {
  return {
    events: [],
    cancelScheduledValues(t) { this.events = this.events.filter((e) => e.at < t); this.cancelledAt = t; },
    setTargetAtTime(v, at, tau) { this.events.push({ v, at, tau }); },
  };
}

test("senza scadenza: solo il volume", () => {
  const p = fakeParam();
  scheduleMaster(p, 10, 0.7);
  assert.deepEqual(p.events, [{ v: 0.7, at: 10, tau: 0.2 }]);
});

test("con scadenza: dissolvenza che inizia FINAL_FADE_S prima e arriva a zero", () => {
  const p = fakeParam();
  scheduleMaster(p, 10, 0.7, 610);
  const fade = p.events[1];
  assert.equal(fade.v, 0);
  assert.equal(fade.at, 610 - FINAL_FADE_S);
  // a scadenza il livello residuo è sotto il 2%
  assert.ok(Math.exp(-FINAL_FADE_S / fade.tau) < 0.02);
});

test("scadenza più vicina della dissolvenza: parte subito ma finisce in orario", () => {
  const p = fakeParam();
  scheduleMaster(p, 100, 0.7, 103);
  assert.equal(p.events[1].at, 100);
  assert.ok(Math.exp(-3 / p.events[1].tau) < 0.02);
});

test("una nuova programmazione sostituisce la precedente (es. cambio volume o durata)", () => {
  const p = fakeParam();
  scheduleMaster(p, 10, 0.7, 610);
  scheduleMaster(p, 20, 0.5, null);
  assert.equal(p.cancelledAt, 20);
  // resta l'evento già passato, la dissolvenza futura sparisce
  assert.deepEqual(p.events, [{ v: 0.7, at: 10, tau: 0.2 }, { v: 0.5, at: 20, tau: 0.2 }]);
});

test("conversione da orologio a clock audio", () => {
  assert.equal(wallToAudio(1_060_000, 1_000_000, 5), 65);
  assert.equal(wallToAudio(900_000, 1_000_000, 5), 5); // già scaduto: subito
});
