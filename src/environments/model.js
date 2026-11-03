// Modello degli ambienti naturali (CR Ambienti naturali, ticket NAT-01).
//
// Un ambiente (Pioggia, Mare, Vento, Camino) è fatto di componenti. Ogni componente ha:
//   - "on": acceso o spento (le componenti obbligatorie sono sempre accese)
//   - parametri propri: livelli 0–100, scale descrittive 0–100 (es. Leggera → Battente), scelte
// Una configurazione rapida ("base") è una scorciatoia che imposta più valori insieme;
// dopo averla scelta ogni parametro resta modificabile.
//
// Configurazione salvata di un ambiente: { base, components: { <id>: { on, <param>: valore } } }
// Tutto lo stato Natura è separato da quello di Esigenze e Solfeggio.

export const SCHEMA_VERSION = 1;

const level = (def) => ({ type: "level", default: def });
const scale = (labels, def) => ({ type: "scale", labels, default: def });
const choice = (options, def) => ({ type: "choice", options, default: def });

// rumore colorato di fondo, comune a tutti gli ambienti ("Altri sottofondi")
const noiseComponent = {
  label: "Rumore colorato",
  optional: true,
  defaultOn: false,
  secondary: true,
  params: {
    color: choice(["pink", "brown", "white"], "pink"),
    level: level(30),
  },
};

export const ENVIRONMENTS = {
  rain: {
    name: "Pioggia",
    components: {
      rain: {
        label: "Pioggia",
        params: {
          intensity: scale(["Leggera", "Moderata", "Intensa", "Battente"], 20),
          level: level(75),
        },
      },
      thunder: {
        label: "Tuoni",
        optional: true,
        defaultOn: false,
        params: {
          frequency: scale(["Rarissimi", "Rari", "Occasionali", "Frequenti", "Continui"], 45),
          // vicinanza: da lontanissimi (rombo grave e ovattato) a vicinissimi (schiocco secco)
          distance: scale(["Lontanissimi", "Lontani", "Medi", "Vicini", "Vicinissimi"], 20),
          // mix: quanto ogni tuono si allontana dalla vicinanza scelta.
          // Uguali = tutti come scelto · Vari = attorno alla scelta · Misti = di ogni distanza
          distanceMix: scale(["Uguali", "Vari", "Misti"], 0),
          // potenza: quanto è grande il tuono (durata, rombo grave, schiocco), distinta dal livello
          power: scale(["Deboli", "Moderati", "Forti", "Violenti"], 40),
          powerMix: scale(["Uguali", "Vari", "Misti"], 0),
          level: level(70),
        },
      },
      wind: {
        label: "Vento",
        optional: true,
        defaultOn: false,
        params: {
          strength: scale(["Brezza", "Sostenuto", "Burrasca"], 25),
          gusts: scale(["Rare", "Variabili", "Frequenti"], 40),
          level: level(55),
        },
      },
      noise: noiseComponent,
    },
    quick: {
      light: {
        label: "Pioggia leggera",
        values: { rain: { intensity: 15 }, thunder: { on: false }, wind: { on: false } },
      },
      heavy: {
        label: "Pioggia intensa",
        values: { rain: { intensity: 70 }, thunder: { on: false }, wind: { on: true, strength: 35, gusts: 40 } },
      },
      storm: {
        label: "Temporale",
        values: {
          rain: { intensity: 85 },
          thunder: { on: true, frequency: 55, distance: 45, distanceMix: 50, power: 55, powerMix: 40 },
          wind: { on: true, strength: 60, gusts: 60 },
        },
      },
    },
    defaultBase: "light",
  },

  sea: {
    name: "Mare",
    components: {
      waves: {
        label: "Onde",
        params: {
          strength: scale(["Calme", "Mosse", "Intense"], 30),
          rhythm: scale(["Lento", "Regolare", "Ravvicinato"], 40),
          level: level(75),
        },
      },
      backwash: { label: "Risacca", params: { level: level(50) } },
      wind: {
        label: "Vento",
        optional: true,
        defaultOn: false,
        params: { strength: scale(["Brezza", "Sostenuto", "Burrasca"], 25), level: level(45) },
      },
      noise: noiseComponent,
    },
    quick: {},
    defaultBase: null,
  },

  wind: {
    name: "Vento",
    components: {
      blow: {
        label: "Soffio",
        params: { strength: scale(["Brezza", "Sostenuto", "Burrasca"], 30), level: level(75) },
      },
      gusts: {
        label: "Raffiche",
        optional: true,
        defaultOn: true,
        params: { frequency: scale(["Rare", "Variabili", "Frequenti"], 35), intensity: scale(["Lievi", "Marcate", "Forti"], 45) },
      },
      noise: noiseComponent,
    },
    quick: {},
    defaultBase: null,
  },

  fire: {
    name: "Camino",
    components: {
      fire: {
        label: "Fuoco",
        params: { liveliness: scale(["Brace", "Tranquillo", "Vivace"], 45), level: level(75) },
      },
      crackle: { label: "Crepitio", params: { level: level(40) } },
      pops: {
        label: "Scoppiettii",
        optional: true,
        defaultOn: true,
        params: { frequency: scale(["Rari", "Occasionali", "Frequenti"], 35), level: level(50) },
      },
      noise: noiseComponent,
    },
    quick: {},
    defaultBase: null,
  },
};

export const ENV_IDS = Object.keys(ENVIRONMENTS);

// ── valori ───────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Parola della scala per un valore 0–100 (es. 70 su Leggera/Moderata/Intensa/Battente → "Intensa"). */
export function scaleWord(param, value) {
  const n = param.labels.length;
  return param.labels[Math.min(n - 1, Math.floor((clamp(value, 0, 100) / 100) * n))];
}

function componentDefaults(comp) {
  const out = { on: comp.optional ? !!comp.defaultOn : true };
  for (const [k, p] of Object.entries(comp.params)) out[k] = p.default;
  return out;
}

function applyValues(config, values) {
  const components = { ...config.components };
  for (const [cid, vals] of Object.entries(values)) components[cid] = { ...components[cid], ...vals };
  return { ...config, components };
}

/** Configurazione di riferimento di una base: valori predefiniti più i valori della scorciatoia. */
export function baseConfig(envId, base) {
  const env = ENVIRONMENTS[envId];
  const components = {};
  for (const [cid, comp] of Object.entries(env.components)) components[cid] = componentDefaults(comp);
  const cfg = { base: base ?? null, components };
  return base && env.quick[base] ? applyValues(cfg, env.quick[base].values) : cfg;
}

/** Configurazione iniziale: gradevole e usabile subito, senza domande. */
export function defaultConfig(envId) {
  return baseConfig(envId, ENVIRONMENTS[envId].defaultBase);
}

/** Applica una configurazione rapida: cambia solo i valori che la scorciatoia elenca. */
export function applyQuick(envId, config, quickId) {
  const q = ENVIRONMENTS[envId].quick[quickId];
  if (!q) return config;
  return { ...applyValues(config, q.values), base: quickId };
}

/** Cambia un parametro (o "on") di una componente, senza toccare le altre. */
export function setParam(envId, config, componentId, key, value) {
  const comp = ENVIRONMENTS[envId].components[componentId];
  if (!comp) return config;
  if (key === "on" && !comp.optional) return config;
  const current = config.components[componentId];
  const next = validateComponent(comp, { ...current, [key]: value });
  return { ...config, components: { ...config.components, [componentId]: next } };
}

/** La configurazione differisce dalla sua base (mostra "Personalizzato"). */
export function isCustomized(envId, config) {
  const ref = baseConfig(envId, config.base);
  for (const [cid, comp] of Object.entries(ENVIRONMENTS[envId].components)) {
    const a = config.components[cid], b = ref.components[cid];
    if (a.on !== b.on) return true;
    // i parametri di una componente spenta non contano: non si sentono
    if (!a.on) continue;
    for (const k of Object.keys(comp.params)) if (a[k] !== b[k]) return true;
  }
  return false;
}

// ── validazione ──────────────────────────────────────────────────────────

function validateComponent(comp, raw, fallback = componentDefaults(comp)) {
  const out = { ...fallback };
  if (!raw || typeof raw !== "object") return out;
  if (comp.optional && typeof raw.on === "boolean") out.on = raw.on;
  for (const [k, p] of Object.entries(comp.params)) {
    const v = raw[k];
    if (p.type === "choice") {
      if (p.options.includes(v)) out[k] = v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.round(clamp(v, 0, 100));
    }
  }
  return out;
}

/** Ripara qualsiasi dato salvato: ciò che manca o non è valido torna al valore predefinito. */
export function validateConfig(envId, raw) {
  const env = ENVIRONMENTS[envId];
  const fallback = defaultConfig(envId);
  if (!raw || typeof raw !== "object") return fallback;
  const base = raw.base === null || (typeof raw.base === "string" && env.quick[raw.base]) ? raw.base : fallback.base;
  const components = {};
  // ciò che manca si prende dalla configurazione rapida di partenza, non dal valore generico:
  // così un parametro aggiunto in una versione nuova non fa risultare "personalizzato" un Temporale intatto
  const ref = baseConfig(envId, base);
  for (const [cid, comp] of Object.entries(env.components)) components[cid] = validateComponent(comp, raw.components?.[cid], ref.components[cid]);
  return { base, components };
}

/** Stato completo della sezione Natura, sempre valido. */
export function validateState(raw) {
  const envs = {};
  for (const id of ENV_IDS) envs[id] = validateConfig(id, raw?.envs?.[id]);
  return { version: SCHEMA_VERSION, envs };
}

export function defaultState() {
  return validateState(null);
}
