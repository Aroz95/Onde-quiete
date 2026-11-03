// Test del modello degli ambienti, della migrazione e dei riepiloghi (NAT-01, NAT-05).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENVIRONMENTS, ENV_IDS, SCHEMA_VERSION, defaultConfig, baseConfig, applyQuick, setParam,
  isCustomized, validateConfig, validateState, scaleWord,
} from "../src/environments/model.js";
import { migrateLegacy, migratePresetId } from "../src/environments/migration.js";
import { summarizeEnv, describeEnv, hasSound } from "../src/environments/describe.js";

const rain = () => defaultConfig("rain");

test("ogni ambiente ha una configurazione iniziale valida e con suono", () => {
  for (const id of ENV_IDS) {
    const cfg = defaultConfig(id);
    assert.deepEqual(validateConfig(id, cfg), cfg, id);
    assert.ok(hasSound(id, cfg), id);
  }
});

test("dati assenti, parziali o non validi tornano ai valori predefiniti", () => {
  assert.deepEqual(validateConfig("rain", null), rain());
  assert.deepEqual(validateConfig("rain", "spazzatura"), rain());
  const broken = validateConfig("rain", {
    base: "inesistente",
    components: { rain: { intensity: 999, level: "alto" }, thunder: { on: "sì", frequency: -5 }, noise: { color: "viola" } },
  });
  assert.equal(broken.base, rain().base);
  assert.equal(broken.components.rain.intensity, 100); // fuori scala: riportato al massimo
  assert.equal(broken.components.rain.level, rain().components.rain.level);
  assert.equal(broken.components.thunder.on, false);
  assert.equal(broken.components.thunder.frequency, 0);
  assert.equal(broken.components.noise.color, "pink");
  // una componente obbligatoria non si può spegnere nemmeno da dati salvati
  assert.equal(validateConfig("rain", { components: { rain: { on: false } } }).components.rain.on, true);
  const s = validateState({ envs: { rain: 42 } });
  assert.equal(s.version, SCHEMA_VERSION);
  for (const id of ENV_IDS) assert.ok(s.envs[id]);
});

test("i parametri sono indipendenti: accendere i tuoni non tocca pioggia né vento", () => {
  const before = rain();
  const after = setParam("rain", before, "thunder", "on", true);
  assert.equal(after.components.thunder.on, true);
  assert.deepEqual(after.components.rain, before.components.rain);
  assert.deepEqual(after.components.wind, before.components.wind);
  const gale = setParam("rain", after, "wind", "strength", 95);
  assert.deepEqual(gale.components.rain, after.components.rain);
  assert.deepEqual(gale.components.thunder, after.components.thunder);
});

test("spegnere una componente ne conserva i valori per la riattivazione", () => {
  let c = setParam("rain", rain(), "wind", "on", true);
  c = setParam("rain", c, "wind", "strength", 80);
  c = setParam("rain", c, "wind", "on", false);
  assert.equal(c.components.wind.strength, 80);
  c = setParam("rain", c, "wind", "on", true);
  assert.equal(c.components.wind.strength, 80);
});

test("configurazioni rapide: scorciatoie che restano modificabili, Temporale dentro Pioggia", () => {
  const storm = applyQuick("rain", rain(), "storm");
  assert.equal(storm.base, "storm");
  assert.ok(storm.components.thunder.on && storm.components.wind.on);
  assert.equal(isCustomized("rain", storm), false);
  const edited = setParam("rain", storm, "thunder", "on", false);
  assert.equal(isCustomized("rain", edited), true);
  // la scorciatoia non cambia ciò che non elenca (rumore di fondo, livelli)
  const withNoise = setParam("rain", setParam("rain", rain(), "noise", "on", true), "rain", "level", 40);
  const q = applyQuick("rain", withNoise, "heavy");
  assert.equal(q.components.noise.on, true);
  assert.equal(q.components.rain.level, 40);
});

test("'Personalizzato' ignora i parametri di una componente spenta", () => {
  const c = setParam("rain", rain(), "thunder", "distance", 90); // tuoni spenti
  assert.equal(isCustomized("rain", c), false);
  assert.equal(isCustomized("rain", setParam("rain", c, "thunder", "on", true)), true);
});

test("scala: parole agli estremi e ai passaggi", () => {
  const p = ENVIRONMENTS.rain.components.rain.params.intensity;
  assert.equal(scaleWord(p, 0), "Leggera");
  assert.equal(scaleWord(p, 30), "Moderata");
  assert.equal(scaleWord(p, 60), "Intensa");
  assert.equal(scaleWord(p, 100), "Battente");
});

test("migrazione: Pioggia e Temporale confluiscono in Pioggia", () => {
  const { state, tweaks } = migrateLegacy({ storm: { nature: 60 }, relax: { beat: 9 } }, "storm", ["rain", "storm"]);
  assert.equal(state.envs.rain.base, "storm");
  assert.equal(state.envs.rain.components.rain.level, 60); // livello equivalente conservato
  assert.ok(state.envs.rain.components.thunder.on);
  assert.deepEqual(tweaks, { relax: { beat: 9 } }); // Esigenze non toccate
  assert.equal(migratePresetId("storm"), "rain");
  assert.equal(migratePresetId("relax"), "relax");
});

test("migrazione: Pioggia e Temporale entrambi personalizzati, vince il selezionato", () => {
  const both = { rain: { nature: 40, noise: 20, noiseType: "brown" }, storm: { nature: 90 } };
  const s1 = migrateLegacy(both, "storm", ["rain", "storm"]).state.envs.rain;
  assert.equal(s1.base, "storm");
  assert.equal(s1.components.rain.level, 90);
  const s2 = migrateLegacy(both, "rain", ["rain", "storm"]).state.envs.rain;
  assert.equal(s2.base, "light");
  assert.equal(s2.components.rain.level, 40);
  assert.deepEqual(s2.components.noise, { on: true, color: "brown", level: 20 });
  // nessuno dei due selezionato: vince Pioggia
  assert.equal(migrateLegacy(both, "relax", ["rain", "storm"]).state.envs.rain.base, "light");
});

test("migrazione: un Temporale selezionato senza personalizzazioni diventa base Temporale", () => {
  assert.equal(migrateLegacy({}, "storm", ["rain", "storm"]).state.envs.rain.base, "storm");
  assert.equal(migrateLegacy({}, "relax", ["rain", "storm"]).state.envs.rain.base, "light");
});

test("migrazione selettiva: gli ambienti non ancora attivi conservano i vecchi dati", () => {
  const { tweaks } = migrateLegacy({ waves: { nature: 50 }, rain: { nature: 30 } }, "waves", ["rain", "storm"]);
  assert.deepEqual(tweaks, { waves: { nature: 50 } });
});

test("riepiloghi: configurazione effettiva, mai componenti spente", () => {
  let c = rain();
  assert.equal(summarizeEnv("rain", c), "Leggera");
  c = applyQuick("rain", c, "storm");
  assert.equal(summarizeEnv("rain", c), "Battente · Tuoni · Vento sostenuto");
  c = setParam("rain", c, "wind", "on", false);
  assert.doesNotMatch(summarizeEnv("rain", c), /Vento/);
  assert.doesNotMatch(describeEnv("rain", c), /vento/);
  c = setParam("rain", c, "thunder", "level", 0);
  assert.doesNotMatch(summarizeEnv("rain", c), /Tuoni/);
  c = setParam("rain", setParam("rain", c, "wind", "on", true), "wind", "strength", 95);
  assert.match(summarizeEnv("rain", c), /Burrasca/);
});

test("tutti i livelli a zero: 'Nessun suono attivo', nessuna descrizione inventata", () => {
  let c = applyQuick("rain", rain(), "storm");
  for (const cid of ["rain", "thunder", "wind"]) c = setParam("rain", c, cid, "level", 0);
  assert.equal(hasSound("rain", c), false);
  assert.equal(summarizeEnv("rain", c), "Nessun suono attivo");
  assert.match(describeEnv("rain", c), /Nessun suono attivo/);
});

test("riepiloghi degli altri ambienti (per revisione dei testi)", () => {
  for (const id of ENV_IDS) console.log(`  ${id.padEnd(5)} ${summarizeEnv(id, defaultConfig(id)).padEnd(34)} ${describeEnv(id, defaultConfig(id))}`);
  for (const q of Object.keys(ENVIRONMENTS.rain.quick)) console.log(`  rain/${q.padEnd(6)} ${summarizeEnv("rain", baseConfig("rain", q)).padEnd(34)} ${describeEnv("rain", baseConfig("rain", q))}`);
});
