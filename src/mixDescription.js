// Descrizioni a parole del mix attivo (ticket OQ-07).
//
// Le frasi nascono dai livelli reali, non da un testo fisso per preset: così restano vere
// anche dopo una personalizzazione e non citano mai un suono spento.
// Descrivono com'è il suono, mai che effetto avrà su chi ascolta.

// usate quando la natura è il suono principale del mix
const NATURE_MAIN = {
  rain: "Pioggia fitta e costante",
  waves: "Onde che vanno e vengono",
  wind: "Vento a raffiche",
  fire: "Fuoco che scoppietta",
  storm: "Pioggia battente e tuoni lontani",
};
// usate quando la natura accompagna altri suoni
const NATURE_SIDE = {
  rain: "pioggia",
  waves: "onde del mare",
  wind: "vento",
  fire: "camino",
  storm: "temporale",
};
const NOISE_COLOR = { pink: "rosa", brown: "marrone", white: "bianco" };

// sotto questi livelli una componente è "leggera" o "in sottofondo"
const SOFT = 30;

function toneLevel(tone) {
  if (tone <= 40) return "tono discreto";
  if (tone <= 60) return "tono morbido";
  return "tono pieno";
}
function toneRegister(car) {
  if (car < 150) return " grave";
  if (car > 260) return " chiaro";
  return "";
}
// il battimento si sente come una lenta pulsazione del tono
function pulse(beat) {
  if (beat < 4) return "lentissima";
  if (beat < 8) return "lenta";
  if (beat < 13) return "calma";
  if (beat < 30) return "vivace";
  return "rapida";
}
function pureNote(car) {
  if (car < 420) return "nota pura bassa";
  if (car < 560) return "nota pura media";
  return "nota pura alta";
}

/** Le componenti udibili del mix, dalla più forte alla più debole. */
export function mixParts(s) {
  const parts = [];
  if (s.tone > 0) {
    const text = s.beat > 0
      ? `${toneLevel(s.tone)}${toneRegister(s.car)} a pulsazione ${pulse(s.beat)}`
      : pureNote(s.car);
    parts.push({ kind: "tone", level: s.tone, text });
  }
  if (s.nature > 0) {
    parts.push({
      kind: "nature", level: s.nature, type: s.natureType,
      text: NATURE_SIDE[s.natureType] + (s.nature <= SOFT ? " in sottofondo" : ""),
    });
  }
  if (s.noise > 0) {
    parts.push({
      kind: "noise", level: s.noise,
      text: `rumore ${NOISE_COLOR[s.noiseType]}` + (s.noise <= 25 ? " leggero" : ""),
    });
  }
  // a parità di livello: tono, poi natura, poi rumore (ordine di inserimento)
  return parts.sort((a, b) => b.level - a.level);
}

function joinItalian(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Frase breve per tessere e riquadro principale, es. "Tono morbido a pulsazione calma e rumore rosa leggero". */
export function describeMix(s) {
  const parts = mixParts(s);
  if (!parts.length) return "Tutti i livelli sono a zero: alzane uno in Regola";
  const texts = parts.map((p) => p.text);
  // se il suono principale è la natura, si usa la descrizione più evocativa
  if (parts[0].kind === "nature") texts[0] = NATURE_MAIN[parts[0].type];
  const sentence = joinItalian(texts);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Il mix contiene un battimento binaurale udibile: solo allora servono le cuffie. */
export function needsHeadphones(s) {
  return s.tone > 0 && s.beat > 0;
}
