// Riepiloghi a parole della configurazione effettiva di un ambiente (NAT-05).
// Non citano mai una componente spenta o a livello zero.

import { ENVIRONMENTS, scaleWord } from "./model.js";

const NOISE_COLOR = { pink: "rosa", brown: "marrone", white: "bianco" };

/** Una componente si sente: accesa e con livello sopra zero. */
export function audible(comp, values) {
  if (!values?.on) return false;
  return comp.params.level ? values.level > 0 : true;
}

export function hasSound(envId, config) {
  return Object.entries(ENVIRONMENTS[envId].components).some(([cid, comp]) => audible(comp, config.components[cid]));
}

const word = (envId, cid, key, cfg) => scaleWord(ENVIRONMENTS[envId].components[cid].params[key], cfg.components[cid][key]);
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// parti della sintesi breve per ambiente, nell'ordine in cui compaiono
const SHORT = {
  rain: (c, w) => [
    audible(ENVIRONMENTS.rain.components.rain, c.rain) && w("rain", "intensity"),
    // nella sintesi breve la distanza si precisa solo agli estremi
    audible(ENVIRONMENTS.rain.components.thunder, c.thunder) &&
      ({ Lontanissimi: "Tuoni lontani", Lontani: "Tuoni lontani", Vicini: "Tuoni vicini", Vicinissimi: "Tuoni vicini" }[w("thunder", "distance")] || "Tuoni"),
    audible(ENVIRONMENTS.rain.components.wind, c.wind) && (w("wind", "strength") === "Burrasca" ? "Burrasca" : `Vento ${lower(w("wind", "strength"))}`),
  ],
  sea: (c, w) => [
    audible(ENVIRONMENTS.sea.components.waves, c.waves) && `Onde ${lower(w("waves", "strength"))}`,
    audible(ENVIRONMENTS.sea.components.wind, c.wind) ? "Vento" : "Senza vento",
  ],
  wind: (c, w) => [
    audible(ENVIRONMENTS.wind.components.blow, c.blow) && w("blow", "strength"),
    c.gusts.on ? `Raffiche ${lower(w("gusts", "frequency"))}` : "Senza raffiche",
  ],
  fire: (c, w) => [
    audible(ENVIRONMENTS.fire.components.fire, c.fire) && `Fuoco ${lower(w("fire", "liveliness"))}`,
    audible(ENVIRONMENTS.fire.components.pops, c.pops) ? "Scoppiettii" : "Senza scoppiettii",
  ],
};

/** Sintesi breve per la tessera, es. "Intensa · Tuoni lontani". */
export function summarizeEnv(envId, config) {
  if (!hasSound(envId, config)) return "Nessun suono attivo";
  const w = (cid, key) => word(envId, cid, key, config);
  const parts = SHORT[envId](config.components, w).filter(Boolean);
  return parts.length ? parts.join(" · ") : "Solo rumore di fondo";
}

/** Descrizione completa per il pannello, es. "Pioggia intensa, tuoni lontani rari e vento sostenuto a raffiche variabili". */
export function describeEnv(envId, config) {
  if (!hasSound(envId, config)) return "Nessun suono attivo: alza il livello di una componente";
  const c = config.components;
  const w = (cid, key) => lower(word(envId, cid, key, config));
  const parts = [];
  if (envId === "rain") {
    const R = ENVIRONMENTS.rain.components;
    if (audible(R.rain, c.rain)) parts.push(`pioggia ${w("rain", "intensity")}`);
    if (audible(R.thunder, c.thunder)) {
      const dist = { medi: "a media distanza" }[w("thunder", "distance")] || w("thunder", "distance");
      parts.push(`tuoni ${w("thunder", "power")} ${w("thunder", "frequency")} ${dist}`);
    }
    if (audible(R.wind, c.wind)) parts.push(w("wind", "strength") === "burrasca" ? `burrasca a raffiche ${w("wind", "gusts")}` : `vento ${w("wind", "strength")} a raffiche ${w("wind", "gusts")}`);
  } else {
    parts.push(summarizeEnv(envId, config).toLowerCase().split(" · ").join(", "));
  }
  if (audible(ENVIRONMENTS[envId].components.noise, c.noise)) parts.push(`rumore ${NOISE_COLOR[c.noise.color]} di fondo`);
  const s = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}` : parts[0];
  return s.charAt(0).toUpperCase() + s.slice(1);
}
