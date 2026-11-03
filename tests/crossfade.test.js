// Test delle dissolvenze incrociate (OQ-03) con un contesto audio finto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CROSSFADE_S, fadeCurve, createSlot, switchSource, liveSources } from "../src/audio/crossfade.js";

// contesto finto: registra le automazioni e lascia far "finire" le sorgenti a comando
function fakeCtx() {
  const ctx = { currentTime: 0, sources: [] };
  const param = () => ({
    value: 1,
    curves: [],
    setValueCurveAtTime(curve, at, dur) {
      // come nel Web Audio: due curve sovrapposte sullo stesso parametro sono un errore
      for (const c of this.curves) if (at < c.at + c.dur && c.at < at + dur) throw new Error("curve sovrapposte");
      this.curves.push({ curve, at, dur });
    },
  });
  const node = () => ({ connect(n) { return n; }, disconnect() { this.disconnected = true; } });
  ctx.createGain = () => ({ ...node(), gain: param() });
  ctx.createBufferSource = () => {
    const s = { ...node(), started: null, stopAt: null, onended: null,
      start(at, off) { this.started = { at, off }; }, stop(at) { this.stopAt = at; } };
    ctx.sources.push(s);
    return s;
  };
  ctx.finishDue = () => ctx.sources.forEach((s) => {
    if (s.stopAt != null && s.stopAt <= ctx.currentTime && !s.ended) { s.ended = true; s.onended?.(); }
  });
  return ctx;
}
const buf = { duration: 6 };

test("le curve sono a potenza costante", () => {
  const i = fadeCurve("in"), o = fadeCurve("out");
  assert.equal(i[0], 0);
  assert.ok(Math.abs(o[0] - 1) < 1e-9);
  for (let k = 0; k < i.length; k++) assert.ok(Math.abs(i[k] ** 2 + o[k] ** 2 - 1) < 1e-6);
});

test("primo avvio senza dissolvenza, cambio successivo con dissolvenza", () => {
  const ctx = fakeCtx();
  const slot = createSlot(ctx, {});
  switchSource(slot, buf, { fade: false });
  assert.equal(slot.current.inGain.gain.curves.length, 0);
  ctx.currentTime = 5;
  const first = slot.current;
  switchSource(slot, buf);
  assert.equal(slot.current.inGain.gain.curves.length, 1);
  assert.equal(slot.current.inGain.gain.value, 0);
  assert.equal(first.outGain.gain.curves[0].at, 5);
  assert.ok(Math.abs(first.src.stopAt - (5 + CROSSFADE_S + 0.05)) < 1e-9);
});

test("a fine dissolvenza la sorgente precedente viene fermata e scollegata", () => {
  const ctx = fakeCtx();
  const slot = createSlot(ctx, {});
  switchSource(slot, buf, { fade: false });
  const old = slot.current;
  switchSource(slot, buf);
  assert.equal(liveSources(slot), 2);
  ctx.currentTime = 1;
  ctx.finishDue();
  assert.equal(liveSources(slot), 1);
  assert.ok(old.src.disconnected && old.inGain.disconnected && old.outGain.disconnected);
});

test("cambi rapidi a metà dissolvenza: nessuna automazione sovrapposta, nessun accumulo", () => {
  const ctx = fakeCtx();
  const slot = createSlot(ctx, {});
  switchSource(slot, buf, { fade: false });
  for (let k = 1; k <= 10; k++) {
    ctx.currentTime = k * 0.1; // un cambio ogni 100 ms
    assert.doesNotThrow(() => switchSource(slot, buf));
    ctx.finishDue();
  }
  ctx.currentTime = 3;
  ctx.finishDue();
  assert.equal(liveSources(slot), 1);
});

test("togliere la sorgente la fa sfumare senza sostituirla", () => {
  const ctx = fakeCtx();
  const slot = createSlot(ctx, {});
  switchSource(slot, buf, { fade: false });
  switchSource(slot, buf);
  switchSource(slot, null);
  assert.equal(slot.current, null);
  ctx.currentTime = 2;
  ctx.finishDue();
  assert.equal(liveSources(slot), 0);
});
