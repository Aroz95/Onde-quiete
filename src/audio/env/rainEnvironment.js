// Ambiente Pioggia (NAT-02, NAT-03): pioggia, tuoni e vento come componenti indipendenti.
//
//   pioggia  (continua)  fondo d'acqua filtrato + 3 strati di gocce + corpo grave → livello pioggia
//   tuoni    (eventi)    rimbombo + schiocco, distanza e intervalli variabili      → livello tuoni
//   vento    (ciclica)   soffio filtrato + ululato + raffiche programmate          → livello vento
//   tutto                                                                          → uscita ambiente
//
// Le regolazioni si applicano dal vivo con transizioni morbide. Eventi e raffiche sono scritti
// in anticipo nel clock audio (fino a un orizzonte), quindi continuano anche se il JavaScript
// della pagina è rallentato; alla pausa quelli futuri si annullano e alla ripresa si riparte
// da adesso, senza recuperi in gruppo.

import { rainSources, THUNDER_VARIANTS, CRACK_VARIANTS } from "./rainSources.js";
import { startSequence, planUntil, cancelFuture, thunderRule, gustRule } from "./scheduler.js";

const TAU = 0.6; // costante di tempo dei cambi di regolazione (circa 2 s per assestarsi)
const FADE_S = 0.8; // dissolvenza di attivazione, disattivazione e cambio ambiente
const THUNDER_HORIZON_S = 90;
const GUST_HORIZON_S = 60;

// guadagno massimo di ogni componente a livello 100 (calibrato con le misure, vedi report)
export const RAIN_GAIN = { rain: 1.05, thunder: 1.0, wind: 2.2 };

// ── intensità della pioggia: ancore Leggera, Moderata, Intensa, Battente ─────
// ogni riga dà il valore del parametro alle quattro ancore; in mezzo si interpola
export const RAIN_CURVES = {
  light: [1.0, 0.75, 0.3, 0.12], // gocce rade e morbide
  mid: [0.0, 0.65, 0.85, 0.55], // gocce fitte
  heavy: [0.0, 0.0, 0.55, 1.0], // scroscio
  bed: [0.06, 0.18, 0.4, 0.65], // fondo d'acqua continuo
  bedLow: [6500, 6500, 6000, 5200], // taglio alto del fondo (Hz): l'acquazzone è più pieno e meno sibilante
  bedHigh: [1800, 1200, 600, 250], // taglio basso del fondo (Hz): più corpo con più pioggia
  body: [0.0, 0.05, 0.3, 0.6], // rombo grave dell'acquazzone
  comp: [1.0, 1.0, 0.93, 0.82], // compensazione di loudness (misurata: senza, la battente era 2,1 dB sopra la leggera)
};

export function interpolate(curve, x) {
  const t = Math.min(1, Math.max(0, x)) * (curve.length - 1);
  const i = Math.min(curve.length - 2, Math.floor(t));
  return curve[i] + (curve[i + 1] - curve[i]) * (t - i);
}

// le sorgenti si generano una volta per contesto audio e si riusano tra un ambiente e l'altro
const sourceCache = new WeakMap();
function cached(ctx) {
  if (!sourceCache.has(ctx)) {
    const src = rainSources(ctx);
    const memo = new Map();
    const get = (key, make) => {
      if (!memo.has(key)) memo.set(key, make().catch((e) => { memo.delete(key); throw e; }));
      return memo.get(key);
    };
    sourceCache.set(ctx, {
      white: () => get("white", src.white),
      windNoise: () => get("windNoise", src.windNoise),
      drops: (l) => get("drops-" + l, () => src.drops(l)),
      thunder: () => get("thunder", () => Promise.all([
        ...Array.from({ length: THUNDER_VARIANTS }, (_, v) => src.rumble(v)),
        ...Array.from({ length: CRACK_VARIANTS }, (_, v) => src.crack(v)),
      ]).then((b) => ({ rumbles: b.slice(0, THUNDER_VARIANTS), cracks: b.slice(THUNDER_VARIANTS) }))),
    });
  }
  return sourceCache.get(ctx);
}

const level = (v, max) => (v / 100) * max;
const set = (param, value, t, tau = TAU) => param.setTargetAtTime(value, t, tau);

export function createRainEnvironment(ctx, destination, initialConfig, { onStatus = () => {}, rng = Math.random } = {}) {
  const sources = cached(ctx);
  let config = initialConfig;
  let active = false; // l'audio sta suonando (eventi e raffiche si pianificano solo allora)
  let disposed = false;
  const status = { rain: "loading", thunder: "idle", wind: "ready" };
  const report = (cid, s) => { status[cid] = s; if (!disposed) onStatus({ ...status }); };
  const live = new Set(); // sorgenti e oscillatori avviati, per il rilascio
  const pending = new Set(); // caricamenti in corso (per misure e test)
  const wait = (p) => { pending.add(p); p.finally(() => pending.delete(p)).catch(() => {}); return p; };
  const track = (node) => { live.add(node); node.addEventListener?.("ended", () => live.delete(node)); return node; };

  const output = ctx.createGain();
  output.gain.value = 0;
  output.connect(destination);
  output.gain.setValueCurveAtTime(new Float32Array([0, 0.5, 0.85, 1]), ctx.currentTime, FADE_S);

  // ── pioggia ────────────────────────────────────────────────────────────
  const rainLevel = ctx.createGain();
  rainLevel.gain.value = 0;
  rainLevel.connect(output);
  const shape = ctx.createGain(); // compensazione di loudness dell'intensità
  shape.connect(rainLevel);
  const bedHigh = ctx.createBiquadFilter(); bedHigh.type = "highpass"; bedHigh.Q.value = 0.5;
  const bedLow = ctx.createBiquadFilter(); bedLow.type = "lowpass"; bedLow.Q.value = 0.5;
  const bedGain = ctx.createGain();
  bedHigh.connect(bedLow).connect(bedGain).connect(shape);
  const bodyFilter = ctx.createBiquadFilter(); bodyFilter.type = "lowpass"; bodyFilter.frequency.value = 280;
  const bodyGain = ctx.createGain();
  bodyFilter.connect(bodyGain).connect(shape);
  const layerGain = { light: ctx.createGain(), mid: ctx.createGain(), heavy: ctx.createGain() };
  for (const g of Object.values(layerGain)) g.connect(shape);

  function applyRain(t) {
    const c = config.components.rain;
    const x = c.intensity / 100;
    for (const l of ["light", "mid", "heavy"]) set(layerGain[l].gain, interpolate(RAIN_CURVES[l], x), t);
    set(bedGain.gain, interpolate(RAIN_CURVES.bed, x), t);
    set(bedLow.frequency, interpolate(RAIN_CURVES.bedLow, x), t);
    set(bedHigh.frequency, interpolate(RAIN_CURVES.bedHigh, x), t);
    set(bodyGain.gain, interpolate(RAIN_CURVES.body, x), t);
    set(shape.gain, interpolate(RAIN_CURVES.comp, x), t);
    set(rainLevel.gain, level(c.level, RAIN_GAIN.rain), t);
  }
  applyRain(ctx.currentTime);

  function loop(buffer, target, rate = 1) {
    const s = track(ctx.createBufferSource());
    s.buffer = buffer;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(target);
    s.start(ctx.currentTime, rng() * buffer.duration);
    return s;
  }

  wait(Promise.all([sources.white(), sources.drops("light"), sources.drops("mid"), sources.drops("heavy")]))
    .then(([white, light, mid, heavy]) => {
      if (disposed) return;
      // fondo e corpo grave dalla stessa sorgente, filtrata in due modi (nessun ritardo tra le copie)
      const bed = loop(white, bedHigh);
      bed.connect(bodyFilter);
      // una sorgente per strato: due copie dello stesso strato a velocità diverse
      // creavano un effetto "flanger", cioè un timbro metallico
      for (const [l, buf] of [["light", light], ["mid", mid], ["heavy", heavy]]) loop(buf, layerGain[l]);
      report("rain", "ready");
    })
    .catch(() => report("rain", "error"));

  // ── tuoni ──────────────────────────────────────────────────────────────
  const thunderLevel = ctx.createGain();
  thunderLevel.gain.value = 0;
  thunderLevel.connect(output);
  let thunderBuffers = null;
  let thunderSeq = { nextAt: Infinity, events: [] };
  const thunderEvents = new Map(); // evento → nodi

  function loadThunder() {
    if (thunderBuffers || status.thunder === "loading") return;
    report("thunder", "loading");
    wait(sources.thunder())
      .then((b) => {
        if (disposed) return;
        thunderBuffers = b;
        report("thunder", "ready");
        restartThunder();
      })
      .catch(() => report("thunder", "error"));
  }

  function playThunder(ev) {
    const c = config.components.thunder;
    const d = c.distance / 100; // 0 lontanissimo, 1 vicinissimo
    const pw = (c.power ?? 40) / 100; // 0 debole, 1 violento
    const pan = ctx.createStereoPanner();
    // i tuoni vicini si sentono più "di lato", quelli lontani più diffusi al centro
    pan.pan.value = (rng() * 2 - 1) * (0.3 + 0.5 * d);
    pan.connect(thunderLevel);
    const nodes = [pan];
    // rimbombo: lontano è più grave, più lento ad arrivare e più ovattato
    const pick = () => thunderBuffers.rumbles[Math.floor(rng() * thunderBuffers.rumbles.length)];
    const rumble = track(ctx.createBufferSource());
    rumble.buffer = pick();
    rumble.playbackRate.value = 0.72 + 0.4 * d - 0.08 * pw;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 150 + 3500 * d ** 1.6; // anche i lontanissimi restano udibili su un telefono
    lp.Q.value = 0.6;
    // potenza: più rombo grave (fino a +9 dB sotto i 120 Hz) e coda più lunga
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = 120;
    shelf.gain.value = -4 + 13 * pw + 4 * pw ** 3;
    const g = ctx.createGain();
    // la potenza cresce piano fino a "Forti" e poi molto: i violenti dominano la scena
    const boost = 0.5 + 0.55 * pw + 2.4 * pw ** 3;
    const amp = (0.4 + 0.6 * d ** 1.2) * boost * (0.8 + 0.2 * rng());
    const attack = 0.03 + 2.2 * (1 - d) ** 1.5;
    const hold = 2 + 9 * pw; // quanto resta pieno prima di spegnersi
    const tau = 0.6 + 1.8 * pw;
    g.gain.setValueAtTime(0, ev.start);
    g.gain.linearRampToValueAtTime(amp, ev.start + attack);
    g.gain.setTargetAtTime(0, ev.start + attack + hold, tau);
    rumble.connect(lp).connect(shelf).connect(g).connect(pan);
    rumble.start(ev.start);
    const fadeEnd = ev.start + attack + hold + 5 * tau;
    ev.end = Math.min(ev.start + rumble.buffer.duration / rumble.playbackRate.value, fadeEnd);
    rumble.stop(ev.end + 0.05);
    nodes.push(rumble, lp, shelf, g);
    // tuoni forti: un secondo rotolio sovrapposto, poco dopo il primo
    if (pw > 0.5) {
      const roll = track(ctx.createBufferSource());
      roll.secondary = true; // parte dello stesso tuono (le misure contano un tuono solo)
      roll.buffer = pick();
      roll.playbackRate.value = rumble.playbackRate.value * (0.9 + 0.15 * rng());
      const rg = ctx.createGain();
      rg.gain.value = ((pw - 0.5) / 0.5) * 0.55;
      const at = ev.start + 0.4 + 1.4 * rng();
      roll.connect(rg).connect(lp);
      roll.start(at);
      roll.stop(ev.end);
      nodes.push(roll, rg);
    }
    // schiocco solo per i fulmini abbastanza vicini, tanto più forte quanto più vicino e potente
    if (d > 0.35) {
      const crack = track(ctx.createBufferSource());
      crack.buffer = thunderBuffers.cracks[Math.floor(rng() * thunderBuffers.cracks.length)];
      const cg = ctx.createGain();
      cg.gain.value = ((d - 0.35) / 0.65) ** 1.3 * (0.45 + 0.65 * pw + 1.2 * pw ** 3) * (0.8 + 0.2 * rng());
      // vicinissimi: lo schiocco arriva insieme al lampo; un po' più lontano, con un leggero ritardo
      crack.connect(cg).connect(pan);
      crack.start(ev.start + (1 - d) * 0.25);
      nodes.push(crack, cg);
    }
    rumble.addEventListener("ended", () => {
      nodes.forEach((n) => { try { n.disconnect(); } catch { /* già scollegato */ } });
      thunderEvents.delete(ev);
    });
    thunderEvents.set(ev, { gain: g, sources: nodes.filter((n) => n instanceof AudioScheduledSourceNode) });
  }

  // annulla i tuoni non ancora iniziati; quelli in corso sfumano se `fadeCurrent`
  function stopThunder(fadeCurrent) {
    const now = ctx.currentTime;
    thunderSeq = cancelFuture(thunderSeq, now).state;
    for (const [ev, n] of thunderEvents) {
      if (ev.start > now) {
        n.sources.forEach((s) => { try { s.stop(); } catch { /* */ } });
      } else if (fadeCurrent) {
        n.gain.gain.cancelScheduledValues(now);
        n.gain.gain.setTargetAtTime(0, now, 0.2);
        n.sources.forEach((s) => { try { s.stop(now + 1.2); } catch { /* */ } });
      }
    }
  }

  function restartThunder() {
    stopThunder(false);
    const c = config.components.thunder;
    if (!active || !c.on || !thunderBuffers) return;
    thunderSeq = { ...startSequence(ctx.currentTime, thunderRule(c.frequency / 100, (c.power ?? 40) / 100), rng), events: thunderSeq.events };
    topUpThunder();
  }

  function topUpThunder() {
    const c = config.components.thunder;
    if (!active || !c.on || !thunderBuffers || disposed) return;
    const { state, added } = planUntil(thunderSeq, ctx.currentTime + THUNDER_HORIZON_S, thunderRule(c.frequency / 100, (c.power ?? 40) / 100), rng);
    thunderSeq = state;
    added.forEach(playThunder);
  }

  // ── vento ──────────────────────────────────────────────────────────────
  const windLevel = ctx.createGain();
  windLevel.gain.value = 0;
  windLevel.connect(output);
  let wind = null; // nodi del vento, creati quando si accende e rilasciati quando si spegne
  let gustSeq = { nextAt: Infinity, events: [] };

  function buildWind(white) {
    const gust = ctx.createGain();
    gust.connect(windLevel);
    const base = ctx.createGain();
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
    const howlBp = ctx.createBiquadFilter(); howlBp.type = "bandpass";
    const howl = ctx.createGain();
    bp.connect(base).connect(gust);
    howlBp.connect(howl).connect(gust);
    const src = loop(white, bp);
    src.connect(howlBp);
    // turbolenza: due oscillazioni lente e non multiple tra loro sul volume del soffio
    const lfoDepth = ctx.createGain();
    const lfo1 = track(ctx.createOscillator()); lfo1.frequency.value = 0.17;
    const lfo2 = track(ctx.createOscillator()); lfo2.frequency.value = 0.43;
    lfo1.connect(lfoDepth); lfo2.connect(lfoDepth);
    lfoDepth.connect(base.gain);
    // l'ululato della burrasca sale e scende di tono lentamente
    const howlLfo = track(ctx.createOscillator()); howlLfo.frequency.value = 0.09;
    const howlDepth = ctx.createGain(); howlDepth.gain.value = 250;
    howlLfo.connect(howlDepth).connect(howlBp.detune);
    [lfo1, lfo2, howlLfo].forEach((o) => o.start());
    return { gust, base, bp, howlBp, howl, lfoDepth, sources: [src, lfo1, lfo2, howlLfo], nodes: [gust, base, bp, howlBp, howl, lfoDepth, howlDepth] };
  }

  function applyWindShape(t) {
    if (!wind) return;
    const s = config.components.wind.strength / 100; // brezza → burrasca
    const baseValue = 0.55 + 0.35 * s;
    set(wind.bp.frequency, 280 + 750 * s, t);
    set(wind.bp.Q, 0.7 + 1.6 * s, t);
    set(wind.base.gain, baseValue, t);
    set(wind.lfoDepth.gain, baseValue * (0.12 + 0.38 * s), t);
    set(wind.howl.gain, Math.max(0, (s - 0.45) / 0.55) * 0.55, t);
    set(wind.howlBp.frequency, 420 + 420 * s, t);
    set(wind.howlBp.Q, 5 + 8 * s, t);
  }

  function enableWind() {
    const c = config.components.wind;
    if (wind) { set(windLevel.gain, level(c.level, RAIN_GAIN.wind), ctx.currentTime, FADE_S / 3); return; }
    wait(sources.windNoise()).then((noise) => {
      if (disposed || wind || !config.components.wind.on) return;
      wind = buildWind(noise);
      applyWindShape(ctx.currentTime);
      set(windLevel.gain, level(config.components.wind.level, RAIN_GAIN.wind), ctx.currentTime, FADE_S / 3);
      restartGusts();
    });
  }

  function disableWind() {
    const now = ctx.currentTime;
    stopGusts();
    windLevel.gain.cancelScheduledValues(now);
    set(windLevel.gain, 0, now, FADE_S / 4);
    const w = wind;
    wind = null;
    if (!w) return;
    // a dissolvenza finita le sorgenti si fermano e i nodi si scollegano
    w.sources.forEach((s) => { try { s.stop(now + FADE_S + 0.3); } catch { /* */ } });
    w.sources[0].addEventListener("ended", () => w.nodes.forEach((n) => { try { n.disconnect(); } catch { /* */ } }));
  }

  function scheduleGust(ev) {
    const s = config.components.wind.strength / 100;
    const A = (0.35 + 0.6 * s) * (0.7 + 0.3 * rng()); // raffica: fino a +5,8 dB sul soffio
    const dur = ev.end - ev.start;
    const rise = dur * 0.35, hold = dur * 0.15, fall = dur * 0.5;
    set(wind.gust.gain, 1 + A, ev.start, rise / 3);
    set(wind.gust.gain, 1, ev.start + rise + hold, fall / 3);
    set(wind.bp.detune, 650 * A, ev.start, rise / 3);
    set(wind.bp.detune, 0, ev.start + rise + hold, fall / 3);
  }

  function stopGusts() {
    const now = ctx.currentTime;
    gustSeq = cancelFuture(gustSeq, now).state;
    if (!wind) return;
    // le raffiche programmate si cancellano e il vento torna al soffio di base
    wind.gust.gain.cancelScheduledValues(now);
    wind.bp.detune.cancelScheduledValues(now);
    set(wind.gust.gain, 1, now, 0.8);
    set(wind.bp.detune, 0, now, 0.8);
  }

  function restartGusts() {
    stopGusts();
    const c = config.components.wind;
    if (!active || !c.on || !wind) return;
    gustSeq = startSequence(ctx.currentTime, gustRule(c.gusts / 100), rng);
    topUpGusts();
  }

  function topUpGusts() {
    const c = config.components.wind;
    if (!active || !c.on || !wind || disposed) return;
    const { state, added } = planUntil(gustSeq, ctx.currentTime + GUST_HORIZON_S, gustRule(c.gusts / 100), rng);
    gustSeq = state;
    added.forEach(scheduleGust);
  }

  // ── aggiornamenti ──────────────────────────────────────────────────────
  function applyAll(prev) {
    const t = ctx.currentTime;
    const c = config.components;
    const p = prev?.components;
    if (!p || p.rain.intensity !== c.rain.intensity || p.rain.level !== c.rain.level) applyRain(t);

    // tuoni
    if (c.thunder.on) loadThunder();
    set(thunderLevel.gain, c.thunder.on ? level(c.thunder.level, RAIN_GAIN.thunder) : 0, t, c.thunder.on ? TAU / 2 : 0.25);
    if (p && p.thunder.on && !c.thunder.on) stopThunder(true);
    else if (!p || p.thunder.on !== c.thunder.on || p.thunder.frequency !== c.thunder.frequency || p.thunder.distance !== c.thunder.distance || p.thunder.power !== c.thunder.power) restartThunder();

    // vento
    if (c.wind.on && (!p || !p.wind.on)) enableWind();
    else if (!c.wind.on && p && p.wind.on) disableWind();
    else if (c.wind.on) {
      if (p.wind.strength !== c.wind.strength) applyWindShape(t);
      if (p.wind.level !== c.wind.level) set(windLevel.gain, level(c.wind.level, RAIN_GAIN.wind), t);
      if (p.wind.gusts !== c.wind.gusts || p.wind.strength !== c.wind.strength) restartGusts();
    }
  }
  applyAll(null);

  return {
    id: "rain",
    output,
    get status() { return { ...status }; },
    /** Nuova configurazione: si applica solo ciò che è cambiato. */
    update(next) {
      if (disposed) return;
      const prev = config;
      config = next;
      applyAll(prev);
    },
    /** L'audio suona (true) o è in pausa (false): eventi e raffiche si pianificano solo mentre suona. */
    setActive(on) {
      if (disposed || on === active) return;
      active = on;
      if (on) { restartThunder(); restartGusts(); } else { stopThunder(false); stopGusts(); }
    },
    /** Estende la pianificazione fino all'orizzonte; da richiamare periodicamente. */
    topUp() { topUpThunder(); topUpGusts(); },
    /** Riprova a preparare una componente il cui caricamento è fallito. */
    retry(cid) { if (cid === "thunder" && status.thunder === "error") { status.thunder = "idle"; loadThunder(); } },
    /** Promise risolta quando i caricamenti in corso sono finiti. */
    async loaded() { while (pending.size) await Promise.allSettled([...pending]); },
    /** Quante sorgenti e oscillatori sono ancora attivi (per le misure e i test). */
    liveCount: () => live.size,
    /** Sfuma e rilascia tutto (cambio ambiente, chiusura). */
    dispose(fade = FADE_S) {
      if (disposed) return;
      disposed = true;
      const now = ctx.currentTime;
      stopThunder(true);
      stopGusts();
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0, now, fade / 4);
      for (const s of live) { try { s.stop(now + fade + 0.3); } catch { /* */ } }
      setTimeout(() => { try { output.disconnect(); } catch { /* */ } }, (fade + 0.5) * 1000);
    },
  };
}
