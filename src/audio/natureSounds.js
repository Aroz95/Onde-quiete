// Suoni della natura sintetizzati: nessun file audio, tutto generato al volo.
// Ogni buffer dura LOOP_SECONDS e si ripete con una dissolvenza incrociata per evitare click.

const LOOP_SECONDS = 20;
const FADE_SECONDS = 0.08;

function rainChannel(sr, n) {
  const out = new Float32Array(n);
  let lp = 0, soft = 0, drop = 0, dropDecay = 0.99;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    // fruscio: rumore bianco passa-alto e poi ammorbidito
    lp += 0.08 * (w - lp);
    const hiss = w - lp;
    soft += 0.5 * (hiss - soft);
    // gocce: brevi impulsi di rumore che decadono in pochi millisecondi
    if (Math.random() < 140 / sr) {
      drop = 0.15 + Math.random() * 0.6;
      dropDecay = Math.exp(-1 / (sr * (0.002 + Math.random() * 0.006)));
    }
    drop *= dropDecay;
    out[i] = soft * 0.35 + (Math.random() * 2 - 1) * drop;
  }
  return out;
}

function wavesChannel(sr, n, offset) {
  const out = new Float32Array(n);
  const period = sr * 10; // un'onda ogni 10 secondi
  let brown = 0, foam = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    const frac = ((i + offset * sr) / period) % 1;
    // l'onda sale lentamente, si infrange e si ritira
    const shape = frac < 0.4 ? Math.pow(frac / 0.4, 2) : Math.exp(-(frac - 0.4) * 5);
    const env = 0.1 + 0.9 * shape;
    brown = (brown + 0.02 * w) / 1.02;
    foam += (0.02 + 0.3 * shape) * (w - foam); // la schiuma diventa più chiara sulla cresta
    out[i] = (brown * 3 + foam * 0.9) * env;
  }
  return out;
}

function windChannel(sr, n, phase) {
  const out = new Float32Array(n);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    const t = i / n; // cicli interi nella durata del loop, così si ripete senza salti
    const gust = 0.5 + 0.3 * Math.sin(2 * Math.PI * (2 * t + phase)) + 0.2 * Math.sin(2 * Math.PI * (5 * t + phase * 2));
    const a = 0.004 + 0.04 * gust * gust;
    y1 += a * (w - y1);
    y2 += a * (y1 - y2);
    out[i] = (y2 / Math.sqrt(a)) * (0.3 + gust);
  }
  return out;
}

function fireChannel(sr, n) {
  const out = new Float32Array(n);
  let rumble = 0, hiss = 0, pop = 0, popDecay = 0.99, burst = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    rumble = (rumble + 0.02 * w) / 1.02;
    hiss += 0.3 * (w - hiss);
    // scoppiettii: singoli o a raffiche
    let newPop = 0;
    if (burst > 0 && Math.random() < 40 / sr) {
      burst--;
      newPop = 0.3 + Math.random() * 0.7;
    }
    if (Math.random() < 3 / sr) burst = Math.floor(Math.random() * 5);
    if (Math.random() < 6 / sr) newPop = 0.2 + Math.random() * 0.8;
    if (newPop) {
      pop = newPop;
      popDecay = Math.exp(-1 / (sr * (0.0008 + Math.random() * 0.002)));
    }
    pop *= popDecay;
    out[i] = rumble * 2.2 + (w - hiss) * 0.04 + w * pop;
  }
  return out;
}

const GENERATORS = {
  rain: (sr, n) => rainChannel(sr, n),
  waves: (sr, n, ch) => wavesChannel(sr, n, ch * 0.35),
  wind: (sr, n, ch) => windChannel(sr, n, ch * 0.13),
  fire: (sr, n) => fireChannel(sr, n),
};

export function makeNatureBuffer(ctx, type) {
  const gen = GENERATORS[type];
  if (!gen) return null;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * LOOP_SECONDS);
  const fade = Math.floor(sr * FADE_SECONDS);
  const buf = ctx.createBuffer(2, len, sr);
  let peak = 0;
  for (let ch = 0; ch < 2; ch++) {
    const raw = gen(sr, len + fade, ch);
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = i < fade ? raw[i] * (i / fade) + raw[len + i] * (1 - i / fade) : raw[i];
      const a = Math.abs(d[i]);
      if (a > peak) peak = a;
    }
  }
  const k = peak ? 0.7 / peak : 1;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] *= k;
  }
  return buf;
}
