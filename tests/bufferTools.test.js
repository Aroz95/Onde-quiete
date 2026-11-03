// Test degli strumenti per i buffer (OQ-10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { foldLoop, softLimit, runSync, runAsync } from "../src/audio/bufferTools.js";

test("foldLoop: la fine del loop si raccorda con l'inizio", () => {
  const len = 1000, fade = 100;
  // segnale a rampa: senza raccordo il salto alla giunzione sarebbe enorme
  const raw = Float32Array.from({ length: len + fade }, (_, i) => i / (len + fade));
  const out = new Float32Array(len);
  foldLoop(raw, len, fade, out);
  // dopo l'ultimo campione il loop ricomincia da out[0], che vale raw[len]: continuità
  assert.ok(Math.abs(out[0] - raw[len]) < 1e-6);
  assert.ok(Math.abs(out[len - 1] - raw[len - 1]) < 1e-6);
  assert.ok(Math.abs(out[0] - out[len - 1]) < 2 / (len + fade));
  // oltre la dissolvenza il segnale è intatto
  assert.equal(out[500], raw[500]);
});

test("softLimit: intatto sotto la soglia, mai oltre 1, simmetrico", () => {
  assert.equal(softLimit(0.5), 0.5);
  assert.equal(softLimit(-0.7), -0.7);
  for (const x of [0.8, 1, 2, 10, 1000]) {
    assert.ok(softLimit(x) <= 1 && softLimit(x) > 0.7, `${x} → ${softLimit(x)}`);
    assert.equal(softLimit(-x), -softLimit(x));
  }
  // crescente: l'ordine dei valori non si inverte
  assert.ok(softLimit(1.2) > softLimit(1.1));
});

function* counter(n) {
  let s = 0;
  for (let i = 0; i < n; i++) { if (i % 10 === 0) yield; s += i; }
  return s;
}

test("runSync e runAsync danno lo stesso risultato", async () => {
  assert.equal(runSync(counter(1000)), 499500);
  assert.equal(await runAsync(counter(1000), 0), 499500);
});
