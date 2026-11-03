// Test della macchina a stati di riproduzione (OQ-05). Si eseguono con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialPlayback, playbackReducer as r, playButton, playbackMessage } from "../src/audio/playbackState.js";

const run = (...actions) => actions.reduce(r, initialPlayback);

test("avvio riuscito: starting → playing", () => {
  const s1 = run({ type: "REQUEST_PLAY", token: 1 });
  assert.equal(s1.status, "starting");
  assert.equal(playButton(s1).label, "Avvio…");
  const s2 = r(s1, { type: "PLAY_OK", token: 1 });
  assert.equal(s2.status, "playing");
  assert.equal(playButton(s2).action, "pause");
});

test("avvio fallito: il pulsante non resta su Pausa", () => {
  const s = run({ type: "REQUEST_PLAY", token: 1 }, { type: "PLAY_FAIL", token: 1, reason: "blocked" });
  assert.equal(s.status, "interrupted");
  assert.equal(playButton(s).label, "▶ Riprendi");
  assert.match(playbackMessage(s), /Riprendi/);
});

test("browser senza audio: stato non disponibile, nessuna azione", () => {
  const s = run({ type: "REQUEST_PLAY", token: 1 }, { type: "PLAY_FAIL", token: 1, reason: "unsupported" });
  assert.equal(s.status, "unsupported");
  assert.equal(playButton(s).action, null);
  assert.equal(r(s, { type: "REQUEST_PLAY", token: 2 }).status, "unsupported");
});

test("pausa durante l'avvio: l'avvio tardivo viene ignorato", () => {
  const s = run(
    { type: "REQUEST_PLAY", token: 1 },
    { type: "REQUEST_PAUSE", token: 2 },
    { type: "PLAY_OK", token: 1 }, // il resume() si conclude dopo
  );
  assert.equal(s.status, "paused");
  assert.equal(s.intent, "pause");
});

test("tocchi rapidi Avvia/Pausa/Avvia: vale solo l'ultima richiesta", () => {
  const s = run(
    { type: "REQUEST_PLAY", token: 1 },
    { type: "REQUEST_PAUSE", token: 2 },
    { type: "REQUEST_PLAY", token: 3 },
    { type: "PLAY_OK", token: 1 },
    { type: "PLAY_FAIL", token: 1, reason: "blocked" },
  );
  assert.equal(s.status, "starting");
  assert.equal(r(s, { type: "PLAY_OK", token: 3 }).status, "playing");
});

test("interruzione di sistema e ripresa automatica", () => {
  let s = run({ type: "REQUEST_PLAY", token: 1 }, { type: "PLAY_OK", token: 1 });
  s = r(s, { type: "CONTEXT_STATE", state: "interrupted" });
  assert.equal(s.status, "interrupted");
  assert.equal(s.intent, "play"); // le regolazioni e l'intenzione restano
  s = r(s, { type: "CONTEXT_STATE", state: "running" });
  assert.equal(s.status, "playing");
});

test("la pausa dell'utente non viene annullata dal sistema", () => {
  let s = run({ type: "REQUEST_PLAY", token: 1 }, { type: "PLAY_OK", token: 1 }, { type: "REQUEST_PAUSE", token: 2 });
  s = r(s, { type: "CONTEXT_STATE", state: "running" });
  assert.equal(s.status, "paused");
});

test("pausa senza sessione resta inattivo", () => {
  assert.equal(run({ type: "REQUEST_PAUSE", token: 1 }).status, "idle");
});

test("fine per timer: torna inattivo e ignora avvii pendenti", () => {
  const s = run(
    { type: "REQUEST_PLAY", token: 1 },
    { type: "PLAY_OK", token: 1 },
    { type: "FINISH", token: 2 },
    { type: "PLAY_OK", token: 1 },
  );
  assert.equal(s.status, "idle");
  assert.equal(playButton(s, false).label, "▶ Avvia");
});
