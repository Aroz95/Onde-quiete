// beat = differenza in Hz tra orecchio sinistro e destro (0 = tono puro)
// car = frequenza portante, cioè la nota che si sente
const base = { nature: 0, natureType: "rain" };

export const PRESET_GROUPS = [
  {
    id: "needs",
    title: "Scegli l'esigenza",
    presets: [
      { ...base, id: "relax", name: "Relax", beat: 10, car: 200, tone: 60, noise: 25, noiseType: "pink", color: "#7fd1c4" },
      { ...base, id: "focus", name: "Concentrazione", beat: 16, car: 240, tone: 55, noise: 20, noiseType: "pink", color: "#f2b880" },
      { ...base, id: "sleep", name: "Sonno", beat: 2.5, car: 120, tone: 45, noise: 30, noiseType: "brown", nature: 35, natureType: "waves", color: "#6f86d6" },
      { ...base, id: "medit", name: "Meditazione", beat: 6, car: 174, tone: 60, noise: 15, noiseType: "brown", color: "#b4a7ff" },
      { ...base, id: "creat", name: "Creatività", beat: 7.5, car: 210, tone: 55, noise: 20, noiseType: "pink", color: "#e79ac2" },
      { ...base, id: "energy", name: "Energia", beat: 40, car: 300, tone: 50, noise: 10, noiseType: "white", color: "#f0d36b" },
      { ...base, id: "study", name: "Studio", beat: 14, car: 220, tone: 35, noise: 30, noiseType: "pink", nature: 30, natureType: "rain", color: "#9fd69a" },
      { ...base, id: "calm", name: "Calma", beat: 8, car: 136, tone: 55, noise: 30, noiseType: "brown", color: "#8fc7e8" },
      { ...base, id: "noise", name: "Solo rumore", beat: 10, car: 200, tone: 0, noise: 70, noiseType: "brown", color: "#9aa4b2" },
    ],
  },
  {
    id: "nature",
    title: "Suoni della natura",
    presets: [
      { id: "rain", name: "Pioggia", beat: 10, car: 200, tone: 0, noise: 0, noiseType: "pink", nature: 80, natureType: "rain", color: "#7fb3d6" },
      { id: "waves", name: "Onde del mare", beat: 10, car: 200, tone: 0, noise: 0, noiseType: "brown", nature: 80, natureType: "waves", color: "#5fb8c9" },
      { id: "wind", name: "Vento", beat: 10, car: 200, tone: 0, noise: 0, noiseType: "brown", nature: 75, natureType: "wind", color: "#c3cbd6" },
      { id: "fire", name: "Camino", beat: 10, car: 200, tone: 0, noise: 0, noiseType: "brown", nature: 80, natureType: "fire", color: "#ef9f6a" },
      { id: "storm", name: "Temporale", beat: 10, car: 200, tone: 0, noise: 0, noiseType: "brown", nature: 80, natureType: "storm", color: "#8e9bd1" },
    ],
  },
  {
    id: "solfeggio",
    title: "Frequenze Solfeggio",
    note: "Frequenze della tradizione olistica: gli effetti attribuiti non sono provati scientificamente.",
    presets: [
      { id: "s396", name: "396 Hz", beat: 0, car: 396, tone: 45, noise: 0, noiseType: "brown", nature: 25, natureType: "wind", color: "#d6a3a3" },
      { id: "s432", name: "432 Hz", beat: 0, car: 432, tone: 45, noise: 0, noiseType: "brown", nature: 25, natureType: "waves", color: "#a3c9a8" },
      { id: "s528", name: "528 Hz", beat: 0, car: 528, tone: 40, noise: 0, noiseType: "brown", nature: 25, natureType: "rain", color: "#e8cf7a" },
      { id: "s639", name: "639 Hz", beat: 0, car: 639, tone: 38, noise: 0, noiseType: "brown", nature: 25, natureType: "waves", color: "#b9a6e0" },
    ],
  },
];

export const PRESETS = PRESET_GROUPS.flatMap((g) => g.presets);

export const NOISE_LABELS = {
  pink: "Rosa",
  brown: "Marrone",
  white: "Bianco",
};

export const NATURE_LABELS = {
  rain: "Pioggia",
  waves: "Onde del mare",
  wind: "Vento",
  fire: "Camino",
  storm: "Temporale",
};

export const TIMER_OPTIONS = [
  { value: 0, label: "Mai" },
  { value: 10, label: "10 min" },
  { value: 25, label: "25 min (pomodoro)" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export function bandOf(beat) {
  if (beat === 0) return "tono puro";
  if (beat < 4) return "onde delta";
  if (beat < 8) return "onde theta";
  if (beat < 13) return "onde alfa";
  if (beat < 30) return "onde beta";
  return "onde gamma";
}

// testo breve sotto il nome di ogni pulsante
export function presetSubtitle(p) {
  if (p.tone > 0) return p.beat > 0 ? `${p.beat} Hz` : "tono puro";
  if (p.nature > 0) return "natura";
  return `rumore ${NOISE_LABELS[p.noiseType].toLowerCase()}`;
}
