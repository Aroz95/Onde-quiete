// beat = differenza in Hz tra orecchio sinistro e destro; car = frequenza portante
export const PRESETS = [
  { id: "relax", name: "Relax", beat: 10, car: 200, tone: 60, noise: 25, noiseType: "pink", color: "#7fd1c4" },
  { id: "focus", name: "Concentrazione", beat: 16, car: 240, tone: 55, noise: 20, noiseType: "pink", color: "#f2b880" },
  { id: "sleep", name: "Sonno", beat: 2.5, car: 120, tone: 45, noise: 45, noiseType: "brown", color: "#6f86d6" },
  { id: "medit", name: "Meditazione", beat: 6, car: 174, tone: 60, noise: 15, noiseType: "brown", color: "#b4a7ff" },
  { id: "creat", name: "Creatività", beat: 7.5, car: 210, tone: 55, noise: 20, noiseType: "pink", color: "#e79ac2" },
  { id: "energy", name: "Energia", beat: 40, car: 300, tone: 50, noise: 10, noiseType: "white", color: "#f0d36b" },
  { id: "study", name: "Studio", beat: 14, car: 220, tone: 35, noise: 45, noiseType: "pink", color: "#9fd69a" },
  { id: "calm", name: "Calma", beat: 8, car: 136, tone: 55, noise: 30, noiseType: "brown", color: "#8fc7e8" },
  { id: "noise", name: "Solo rumore", beat: 10, car: 200, tone: 0, noise: 70, noiseType: "brown", color: "#9aa4b2" },
];

export const NOISE_LABELS = {
  pink: "Rosa (pioggia)",
  brown: "Marrone (mare)",
  white: "Bianco",
};

export const TIMER_OPTIONS = [
  { value: 0, label: "Mai" },
  { value: 10, label: "10 min" },
  { value: 25, label: "25 min (pomodoro)" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export function bandOf(beat) {
  if (beat < 4) return "onde delta";
  if (beat < 8) return "onde theta";
  if (beat < 13) return "onde alfa";
  if (beat < 30) return "onde beta";
  return "onde gamma";
}
