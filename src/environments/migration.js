// Migrazione dai vecchi preset della scheda Natura (NAT-01).
//
//   Pioggia        → ambiente Pioggia, base "Pioggia leggera"
//   Temporale      → ambiente Pioggia, base "Temporale"
//   Onde del mare  → ambiente Mare
//   Vento          → ambiente Vento
//   Camino         → ambiente Camino
//
// Regole:
//   - si conserva solo ciò che ha lo stesso significato: il livello del vecchio suono diventa
//     il livello della componente principale; il rumore di fondo diventa "Altri sottofondi";
//     tutto il resto prende i nuovi valori predefiniti
//   - se l'utente aveva personalizzato sia Pioggia sia Temporale, vince quello che era
//     selezionato; se non era selezionato nessuno dei due, vince Pioggia
//   - Esigenze e Solfeggio non vengono toccati

import { baseConfig, defaultState, validateState } from "./model.js";

export const LEGACY_TO_ENV = {
  rain: { env: "rain", base: "light", main: "rain" },
  storm: { env: "rain", base: "storm", main: "rain" },
  waves: { env: "sea", base: null, main: "waves" },
  wind: { env: "wind", base: null, main: "blow" },
  fire: { env: "fire", base: null, main: "fire" },
};

// nuovo identificativo della tessera selezionata
export function migratePresetId(id) {
  return id === "storm" ? "rain" : id;
}

function fromLegacyTweak(legacyId, tweak) {
  const { env, base, main } = LEGACY_TO_ENV[legacyId];
  const cfg = baseConfig(env, base);
  const components = { ...cfg.components };
  if (typeof tweak.nature === "number") components[main] = { ...components[main], level: tweak.nature };
  if (typeof tweak.noise === "number" || tweak.noiseType) {
    const noise = { ...components.noise };
    if (typeof tweak.noise === "number") { noise.level = tweak.noise; noise.on = tweak.noise > 0; }
    if (tweak.noiseType) noise.color = tweak.noiseType;
    components.noise = noise;
  }
  return { base, components };
}

/**
 * Porta nello stato Natura i dati salvati dalla versione precedente.
 * `tweaks`: personalizzazioni per preset; `selectedId`: preset selezionato;
 * `ids`: quali vecchi preset migrare (gli ambienti si attivano uno alla volta).
 * Restituisce { state, tweaks } con le voci migrate tolte da `tweaks`.
 */
export function migrateLegacy(tweaks = {}, selectedId = null, ids = Object.keys(LEGACY_TO_ENV), state = defaultState()) {
  const next = { ...state, envs: { ...state.envs } };
  const remaining = { ...tweaks };
  // Pioggia e Temporale portano allo stesso ambiente: si applica per ultimo quello
  // selezionato, così vince; se non è selezionato nessuno dei due vince Pioggia
  const order = [...ids].sort((a, b) => rank(a, selectedId) - rank(b, selectedId));
  for (const legacyId of order) {
    const tweak = tweaks?.[legacyId];
    delete remaining[legacyId];
    if (!tweak || typeof tweak !== "object") continue;
    next.envs[LEGACY_TO_ENV[legacyId].env] = fromLegacyTweak(legacyId, tweak);
  }
  // un Temporale selezionato senza personalizzazioni diventa comunque la base Temporale
  if (ids.includes("storm") && selectedId === "storm" && !tweaks?.storm) next.envs.rain = baseConfig("rain", "storm");
  return { state: validateState(next), tweaks: remaining };
}

function rank(id, selectedId) {
  if (id !== "rain" && id !== "storm") return 0;
  if (id === selectedId) return 2;
  return id === "rain" ? 1.5 : 1; // nessuno dei due selezionato: Pioggia dopo Temporale, quindi vince
}
