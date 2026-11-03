// Test della pianificazione degli eventi (NAT-02, NAT-06).
import { test } from "node:test";
import assert from "node:assert/strict";
import { seededRandom, startSequence, planUntil, cancelFuture, thunderRule, gustRule } from "../src/audio/env/scheduler.js";

function plan(rule, seconds, seed = 7, step = 30) {
  const rng = seededRandom(seed);
  let state = startSequence(0, rule, rng);
  const all = [];
  // si pianifica a blocchi, come fa il motore con il suo orizzonte
  for (let t = 0; t < seconds; t += step) {
    const r = planUntil(state, t + step, rule, rng);
    state = r.state;
    all.push(...r.added);
  }
  return { all, state };
}

const maxOverlap = (events) => {
  let max = 0;
  for (const e of events) max = Math.max(max, events.filter((o) => o.start <= e.start && o.end > e.start).length);
  return max;
};

test("tuoni: più frequenza, più eventi nel tempo", () => {
  const hour = 3600;
  const rare = plan(thunderRule(0), hour).all.length;
  const occasional = plan(thunderRule(0.5), hour).all.length;
  const frequent = plan(thunderRule(1), hour).all.length;
  assert.ok(rare < occasional && occasional < frequent, `${rare} < ${occasional} < ${frequent}`);
  // circa una media di 110 s e 14 s (con margine per la casualità)
  assert.ok(rare > 20 && rare < 60, `rari: ${rare}/ora`);
  assert.ok(frequent > 120 && frequent < 330, `frequenti: ${frequent}/ora`);
});

test("tuoni: mai più di 2 sovrapposti e mai più vicini di 6 s, anche al massimo", () => {
  const { all } = plan(thunderRule(1), 3600);
  assert.ok(maxOverlap(all) <= 2);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].start - all[i - 1].start >= 6 - 1e-9);
});

test("intervalli variabili: nessuna sequenza a passo fisso", () => {
  const { all } = plan(thunderRule(0.5), 3600);
  const gaps = all.slice(1).map((e, i) => e.start - all[i].start);
  const distinct = new Set(gaps.map((g) => g.toFixed(1))).size;
  assert.ok(distinct > gaps.length * 0.8, `${distinct} intervalli diversi su ${gaps.length}`);
});

test("il primo tuono dopo l'attivazione arriva presto", () => {
  for (let seed = 1; seed < 50; seed++) {
    const rng = seededRandom(seed);
    const s = startSequence(100, thunderRule(0), rng);
    assert.ok(s.nextAt >= 102 && s.nextAt <= 112, `${s.nextAt}`);
  }
});

test("raffiche: una alla volta, più frequenza più raffiche", () => {
  const few = plan(gustRule(0), 1800).all;
  const many = plan(gustRule(1), 1800).all;
  assert.equal(maxOverlap(few), 1);
  assert.equal(maxOverlap(many), 1);
  assert.ok(many.length > few.length * 2, `${few.length} → ${many.length}`);
});

test("pianificazione a orizzonte: niente eventi oltre il limite", () => {
  const rng = seededRandom(3);
  const s = startSequence(0, thunderRule(1), rng);
  const { added } = planUntil(s, 60, thunderRule(1), rng);
  assert.ok(added.every((e) => e.start < 60));
});

test("pausa: gli eventi futuri si annullano, quelli in corso restano", () => {
  const rule = thunderRule(1);
  const rng = seededRandom(5);
  let { state } = planUntil(startSequence(0, rule, rng), 120, rule, rng);
  const now = 50;
  const { state: after, cancelled } = cancelFuture(state, now);
  assert.ok(cancelled.length > 0 && cancelled.every((e) => e.start > now));
  assert.ok(after.events.every((e) => e.start <= now));
  assert.equal(after.nextAt, Infinity); // nessun nuovo evento finché non si riparte
  assert.equal(planUntil(after, 500, rule, rng).added.length, 0);
});

test("ripresa dopo una lunga pausa: nessun evento arretrato recuperato in gruppo", () => {
  const rule = thunderRule(1);
  const rng = seededRandom(9);
  let { state } = planUntil(startSequence(0, rule, rng), 60, rule, rng);
  state = cancelFuture(state, 60).state;
  // un'ora dopo si riparte da adesso
  const resumedAt = 3660;
  const fresh = { ...startSequence(resumedAt, rule, rng), events: state.events };
  const { added } = planUntil(fresh, resumedAt + 30, rule, rng);
  assert.ok(added.every((e) => e.start >= resumedAt + 2), "nessun evento nel passato");
  assert.ok(added.length <= 3, `al massimo pochi eventi nei primi 30 s: ${added.length}`);
});
