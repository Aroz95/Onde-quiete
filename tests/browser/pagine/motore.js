// Prove del motore degli ambienti con rendering offline (NAT-02, NAT-06).
// Ogni funzione rende uno scenario e restituisce numeri misurati sul segnale in uscita.
import { createRainEnvironment } from "../../../src/audio/env/rainEnvironment.js";
import { defaultConfig, setParam, applyQuick } from "../../../src/environments/model.js";
import { seededRandom } from "../../../src/audio/env/scheduler.js";
import { createGraph } from "../../../src/audio/graph.js";
import { scheduleMaster } from "../../../src/audio/masterSchedule.js";

const SR = 16000; // basta per misurare livelli ed eventi, e rende in fretta
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200);

function rmsDb(buf, from, to) {
  let s = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = Math.floor(from * SR); i < Math.min(d.length, Math.floor(to * SR)); i++) { s += d[i] * d[i]; n++; }
  }
  return +db(Math.sqrt(s / (n || 1))).toFixed(1);
}

// Conta i tuoni che suonano davvero (rimbombi: buffer a 22050 Hz).
// I tuoni sono programmati in anticipo: uno annullato con stop() prima del suo inizio
// non suona mai, quindi non conta.
function countThunder() {
  const sources = [];
  const origStart = AudioBufferSourceNode.prototype.start;
  const origStop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (when = 0, ...a) {
    if (this.buffer && this.buffer.sampleRate === 22050) { this.__start = when; sources.push(this); }
    return origStart.call(this, when, ...a);
  };
  AudioBufferSourceNode.prototype.stop = function (when, ...a) {
    if (this.__start !== undefined && this.__stopAt === undefined) this.__stopAt = when || this.context.currentTime;
    return origStop.call(this, when, ...a);
  };
  return {
    get starts() { return sources.filter((s) => !(s.__stopAt <= s.__start)).map((s) => s.__start); },
    restore: () => { AudioBufferSourceNode.prototype.start = origStart; AudioBufferSourceNode.prototype.stop = origStop; },
  };
}

let cfgThunderOnly = setParam("rain", defaultConfig("rain"), "rain", "level", 0);
cfgThunderOnly = setParam("rain", cfgThunderOnly, "thunder", "on", true);
const thunderOnly = (frequency, distance = 60) =>
  setParam("rain", setParam("rain", cfgThunderOnly, "thunder", "frequency", frequency), "thunder", "distance", distance);

async function prepare(seconds, config, seed = 3) {
  const ctx = new OfflineAudioContext(2, SR * seconds, SR);
  const env = createRainEnvironment(ctx, ctx.destination, config, { rng: seededRandom(seed) });
  await env.loaded();
  return { ctx, env };
}

window.prove = {
  // più frequenza, più tuoni; mai oltre 2 sovrapposti
  async frequenza() {
    const res = {};
    for (const [name, f] of [["rari", 0], ["frequenti", 100]]) {
      const c = countThunder();
      const { ctx, env } = await prepare(240, thunderOnly(f));
      env.setActive(true); env.topUp();
      for (let t = 60; t < 240; t += 60) ctx.suspend(t).then(() => { env.topUp(); ctx.resume(); });
      await ctx.startRendering();
      c.restore();
      res[name] = c.starts.filter((s) => s < 240).length;
    }
    return res;
  },

  // spengo i tuoni durante una coda: la coda sfuma e non arrivano nuovi eventi
  async spegnimento() {
    const c = countThunder();
    const { ctx, env } = await prepare(90, thunderOnly(100, 90));
    env.setActive(true); env.topUp();
    await new Promise((r) => setTimeout(r, 0));
    const first = Math.min(...c.starts);
    const offAt = first + 1.5; // nel pieno del primo tuono
    ctx.suspend(offAt).then(() => { env.update(setParam("rain", thunderOnly(100, 90), "thunder", "on", false)); ctx.resume(); });
    const out = await ctx.startRendering();
    c.restore();
    return {
      primoTuono: +first.toFixed(1), spentoA: +offAt.toFixed(1),
      livelloPrima: rmsDb(out, offAt - 0.5, offAt),
      livelloDopo1s: rmsDb(out, offAt + 1, offAt + 1.5),
      livelloDopo: rmsDb(out, offAt + 3, 90),
      nuoviEventiDopo: c.starts.filter((s) => s > offAt + 0.01).length,
    };
  },

  // pausa e ripresa: niente eventi durante la pausa, niente raffica alla ripresa
  async pausa() {
    const c = countThunder();
    const { ctx, env } = await prepare(200, thunderOnly(100));
    env.setActive(true); env.topUp();
    ctx.suspend(30).then(() => { env.setActive(false); ctx.resume(); });
    ctx.suspend(150).then(() => { env.setActive(true); env.topUp(); ctx.resume(); });
    const out = await ctx.startRendering();
    c.restore();
    const inPause = c.starts.filter((s) => s > 30 && s < 150).length;
    const burst = c.starts.filter((s) => s >= 150 && s < 160).length;
    // le code dei tuoni già partiti prima della pausa durano al massimo una ventina di secondi
    const after = c.starts.filter((s) => s >= 150).sort((a, b) => a - b);
    const minSpacing = Math.min(...after.slice(1).map((s, i) => s - after[i]));
    return { eventiInPausa: inPause, livelloInPausa: rmsDb(out, 60, 150), eventiNeiPrimi10sDopoLaRipresa: burst,
      primoDopoRipresa: +(after[0] - 150).toFixed(1), distanzaMinimaDopoRipresa: +minSpacing.toFixed(1) };
  },

  // ambiente abbandonato mentre si prepara: il caricamento tardivo non lo riattiva
  async tardivo() {
    const ctx = new OfflineAudioContext(2, SR * 10, SR);
    let loops = 0;
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) { if (this.loop) loops++; return orig.apply(this, a); };
    const env = createRainEnvironment(ctx, ctx.destination, defaultConfig("rain"), { rng: seededRandom(4) });
    env.dispose(0.1); // abbandonato subito, prima che le sorgenti siano pronte
    await env.loaded();
    await new Promise((r) => setTimeout(r, 50));
    const out = await ctx.startRendering();
    AudioBufferSourceNode.prototype.start = orig;
    return { sorgentiAvviate: loops, livello: rmsDb(out, 1, 10) };
  },

  // fine del timer durante un temporale: tutto il mix, code e vento compresi, sfuma insieme
  async fineTimer() {
    const ctx = new OfflineAudioContext(2, SR * 40, SR);
    const g = createGraph(ctx, ctx.destination);
    g.toneGain.gain.value = 0; g.noiseGain.gain.value = 0; g.natureGain.gain.value = 0;
    const storm = applyQuick("rain", defaultConfig("rain"), "storm");
    const env = createRainEnvironment(ctx, g.envBus, setParam("rain", storm, "thunder", "frequency", 100), { rng: seededRandom(6) });
    await env.loaded();
    env.setActive(true); env.topUp();
    scheduleMaster(g.master.gain, 0, 0.7, 25); // scadenza a 25 s
    const out = await ctx.startRendering();
    return { prima: rmsDb(out, 10, 16), duranteDissolvenza: rmsDb(out, 21, 22), allaScadenza: rmsDb(out, 25, 26), dopo: rmsDb(out, 27, 40) };
  },

  // cambio di intensità dal vivo: nessuno scatto
  async transizione() {
    const { ctx, env } = await prepare(14, setParam("rain", defaultConfig("rain"), "rain", "intensity", 0));
    env.setActive(true);
    ctx.suspend(6).then(() => { env.update(setParam("rain", defaultConfig("rain"), "rain", "intensity", 100)); ctx.resume(); });
    const out = await ctx.startRendering();
    const d = out.getChannelData(0);
    const steps = [];
    for (let i = SR * 2; i < SR * 5.9; i++) steps.push(Math.abs(d[i] - d[i - 1]));
    steps.sort((a, b) => a - b);
    const p999 = steps[Math.floor(steps.length * 0.999)];
    let maxAround = 0;
    for (let i = SR * 6; i < SR * 6.5; i++) maxAround = Math.max(maxAround, Math.abs(d[i] - d[i - 1]));
    return { prima: rmsDb(out, 3, 5.5), dopo: rmsDb(out, 10, 14), saltoAlCambioSuP999: +(maxAround / p999).toFixed(2) };
  },

  // accensioni e spegnimenti ripetuti: le sorgenti non si accumulano
  async sorgenti() {
    let cfg = setParam("rain", defaultConfig("rain"), "thunder", "on", true);
    const { ctx, env } = await prepare(60, cfg);
    env.setActive(true); env.topUp();
    const counts = [];
    for (let k = 0; k < 10; k++) {
      ctx.suspend(2 + k * 4).then(() => {
        cfg = setParam("rain", cfg, "wind", "on", !cfg.components.wind.on);
        cfg = setParam("rain", cfg, "thunder", "on", !cfg.components.thunder.on);
        env.update(cfg);
        counts.push(env.liveCount());
        ctx.resume();
      });
    }
    ctx.suspend(55).then(() => { counts.push(env.liveCount()); ctx.resume(); });
    await ctx.startRendering();
    return { attiveDopoOgniCambio: counts.join(" "), finali: counts[counts.length - 1] };
  },
};
