// Test delle descrizioni dei preset (OQ-07).
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeMix, shortMix, mixParts, needsHeadphones } from "../src/mixDescription.js";
import { PRESETS, PRESET_GROUPS } from "../src/presets.js";

test("ogni preset ha una descrizione breve, senza Hz", () => {
  for (const p of PRESETS) {
    const d = describeMix(p);
    assert.ok(d.length > 3 && d.length <= 80, `${p.id}: "${d}"`);
    assert.ok(!/hz/i.test(d), `${p.id} cita gli Hz: "${d}"`);
  }
});

test("i preset della stessa scheda hanno descrizioni diverse", () => {
  for (const g of PRESET_GROUPS) {
    const seen = new Map();
    for (const p of g.presets) {
      const d = describeMix(p);
      assert.ok(!seen.has(d), `${p.id} e ${seen.get(d)} hanno la stessa descrizione: "${d}"`);
      seen.set(d, p.id);
    }
  }
});

test("le coppie simili si distinguono: Relax/Calma e Studio/Concentrazione", () => {
  const by = (id) => describeMix(PRESETS.find((p) => p.id === id));
  assert.notEqual(by("relax"), by("calm"));
  assert.notEqual(by("study"), by("focus"));
});

test("una componente spenta non viene mai citata", () => {
  const base = PRESETS.find((p) => p.id === "sleep"); // tono, onde e rumore marrone
  assert.match(describeMix(base), /onde/);
  assert.match(describeMix(base), /rumore marrone/);
  assert.doesNotMatch(describeMix({ ...base, nature: 0 }), /onde/);
  assert.doesNotMatch(describeMix({ ...base, noise: 0 }), /rumore/);
  assert.doesNotMatch(describeMix({ ...base, tone: 0 }), /tono/i);
});

test("la descrizione segue le personalizzazioni", () => {
  const rain = PRESETS.find((p) => p.id === "rain");
  assert.equal(describeMix(rain), "Pioggia fitta e costante");
  assert.equal(describeMix({ ...rain, nature: 20, noise: 60 }), "Rumore rosa e pioggia in sottofondo");
});

test("tutto a zero: invito a regolare, nessun suono inventato", () => {
  assert.match(describeMix({ tone: 0, nature: 0, noise: 0, beat: 10, car: 200, natureType: "rain", noiseType: "pink" }), /Regola/);
});

test("componenti in ordine di livello", () => {
  const parts = mixParts({ tone: 20, beat: 10, car: 200, nature: 70, natureType: "waves", noise: 40, noiseType: "brown" });
  assert.deepEqual(parts.map((p) => p.kind), ["nature", "noise", "tone"]);
});

test("le cuffie servono solo con un battimento binaurale udibile", () => {
  const by = (id) => PRESETS.find((p) => p.id === id);
  assert.equal(needsHeadphones(by("relax")), true);
  assert.equal(needsHeadphones(by("rain")), false);
  assert.equal(needsHeadphones(by("s432")), false); // tono puro
  assert.equal(needsHeadphones({ ...by("relax"), tone: 0 }), false);
});

test("descrizione breve: al massimo 3 parti e 40 caratteri", () => {
  for (const p of PRESETS) {
    const d = shortMix(p);
    assert.ok(d.split(" · ").length <= 3 && d.length <= 40, `${p.id}: "${d}"`);
    assert.ok(!/hz/i.test(d), `${p.id}: "${d}"`);
  }
});

test("descrizione breve: diversa tra i preset della stessa scheda", () => {
  for (const g of PRESET_GROUPS) {
    const seen = new Map();
    for (const p of g.presets) {
      const d = shortMix(p);
      assert.ok(!seen.has(d), `${p.id} e ${seen.get(d)}: "${d}"`);
      seen.set(d, p.id);
    }
  }
});

test("descrizione breve: Relax/Calma e Studio/Concentrazione distinti", () => {
  const by = (id) => shortMix(PRESETS.find((p) => p.id === id));
  assert.notEqual(by("relax"), by("calm"));
  assert.notEqual(by("study"), by("focus"));
  assert.notEqual(by("relax"), by("focus"));
});

test("descrizione breve: nessun suono spento", () => {
  const sleep = PRESETS.find((p) => p.id === "sleep");
  assert.match(shortMix(sleep), /Onde/);
  assert.doesNotMatch(shortMix({ ...sleep, nature: 0 }), /Onde/);
  assert.doesNotMatch(shortMix({ ...sleep, noise: 0 }), /Rumore/);
  assert.doesNotMatch(shortMix({ ...sleep, tone: 0 }), /Tono/);
});

test("descrizioni attuali dei preset (per revisione dei testi)", () => {
  for (const g of PRESET_GROUPS) for (const p of g.presets) console.log(`  ${g.id.padEnd(9)} ${p.name.padEnd(15)} ${shortMix(p).padEnd(38)} ${describeMix(p)}`);
});
