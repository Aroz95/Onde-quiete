import { useCallback, useEffect, useReducer, useRef } from "react";
import { makeNatureBuffer } from "./natureSounds.js";
import { enablePlaybackSession, startKeepAlive, stopKeepAlive } from "./background.js";
import { initialPlayback, playbackReducer } from "./playbackState.js";
import { createSlot, switchSource } from "./crossfade.js";

// oltre questo tempo un resume() senza risposta conta come fallito
const RESUME_TIMEOUT_MS = 4000;

function makeNoiseBuffer(ctx, type) {
  const len = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === "white") {
        d[i] = w * 0.5;
      } else if (type === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  return buf;
}

function applyParams(n, { beat, car, tone, noise, nature }) {
  const t = n.ctx.currentTime;
  n.oscL.frequency.setTargetAtTime(car, t, 0.3);
  n.oscR.frequency.setTargetAtTime(car + beat, t, 0.3);
  n.toneGain.gain.setTargetAtTime((tone / 100) * 0.35, t, 0.3);
  n.noiseGain.gain.setTargetAtTime((noise / 100) * 0.5, t, 0.3);
  n.natureGain.gain.setTargetAtTime((nature / 100) * 0.8, t, 0.4);
}

/**
 * Motore audio: due oscillatori sinusoidali in stereo (battimento binaurale)
 * più un rumore colorato e un suono della natura in loop.
 * Frequenze e volumi cambiano con transizioni morbide; il cambio di tipo di rumore
 * o di suono della natura usa una dissolvenza incrociata (crossfade.js).
 */
export function useAudioEngine({ beat, car, tone, noise, noiseType, nature, natureType, volume }) {
  const nodes = useRef(null);
  const wakeLock = useRef(null);
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback);
  const intentRef = useRef("none"); // copia sincrona dell'intenzione, per i gestori di eventi
  const tokenRef = useRef(0); // numero dell'ultima richiesta play/pausa
  const params = useRef({});
  params.current = { beat, car, tone, noise, nature, volume };

  // i buffer sono costosi da generare: li teniamo in cache per tipo
  const bufferFor = (n, kind, type) => {
    const cache = kind === "noise" ? n.noiseCache : n.natureCache;
    if (!(type in cache)) cache[type] = kind === "noise" ? makeNoiseBuffer(n.ctx, type) : makeNatureBuffer(n.ctx, type);
    return cache[type];
  };

  // `fade: false` al primo avvio; poi ogni cambio sfuma dal suono vecchio al nuovo
  const startNoise = useCallback((type, fade = true) => {
    const n = nodes.current;
    if (n) switchSource(n.noiseSlot, bufferFor(n, "noise", type), { fade });
  }, []);

  const startNature = useCallback((type, fade = true) => {
    const n = nodes.current;
    if (n) switchSource(n.natureSlot, bufferFor(n, "nature", type), { fade });
  }, []);

  const build = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("unsupported");
    const ctx = new Ctx();
    // sospensioni e interruzioni decise dal sistema (telefonate, altre app, Siri)
    ctx.onstatechange = () => dispatch({ type: "CONTEXT_STATE", state: ctx.state });
    const master = ctx.createGain();
    master.gain.value = 0;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
    analyser.connect(ctx.destination);

    const toneGain = ctx.createGain();
    const noiseGain = ctx.createGain();
    const natureGain = ctx.createGain();
    toneGain.connect(master);
    noiseGain.connect(master);
    natureGain.connect(master);

    const panL = ctx.createStereoPanner();
    const panR = ctx.createStereoPanner();
    panL.pan.value = -1;
    panR.pan.value = 1;
    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    oscL.type = oscR.type = "sine";
    oscL.connect(panL).connect(toneGain);
    oscR.connect(panR).connect(toneGain);
    oscL.start();
    oscR.start();

    nodes.current = {
      ctx, master, analyser, toneGain, noiseGain, natureGain, oscL, oscR,
      noiseSlot: createSlot(ctx, noiseGain), natureSlot: createSlot(ctx, natureGain),
      noiseType, natureType, noiseCache: {}, natureCache: {},
    };
    applyParams(nodes.current, params.current);
    startNoise(noiseType, false);
    startNature(natureType, false);
  }, [noiseType, natureType, startNoise, startNature]);

  // aggiorna frequenze e volumi
  useEffect(() => {
    if (nodes.current) applyParams(nodes.current, params.current);
    if (nodes.current && intentRef.current === "play") {
      const n = nodes.current;
      n.master.gain.setTargetAtTime(volume / 100, n.ctx.currentTime, 0.2);
    }
  }, [beat, car, tone, noise, nature, volume]);

  // cambia suono della natura
  useEffect(() => {
    const n = nodes.current;
    if (!n || n.natureType === natureType) return;
    n.natureType = natureType;
    startNature(natureType);
  }, [natureType, startNature]);

  // cambia tipo di rumore
  useEffect(() => {
    const n = nodes.current;
    if (!n || n.noiseType === noiseType) return;
    n.noiseType = noiseType;
    startNoise(noiseType);
  }, [noiseType, startNoise]);

  const releaseWakeLock = async () => {
    try { await wakeLock.current?.release(); } catch { /* ignora */ }
    wakeLock.current = null;
  };

  // Avvio o ripresa. Lo stato diventa "playing" solo se il contesto audio sta davvero suonando.
  const play = useCallback(async () => {
    const token = ++tokenRef.current;
    intentRef.current = "play";
    dispatch({ type: "REQUEST_PLAY", token });
    try {
      // va impostata prima di creare o riprendere il contesto audio
      enablePlaybackSession();
      if (!nodes.current) build();
    } catch {
      dispatch({ type: "PLAY_FAIL", token, reason: "unsupported" });
      return false;
    }
    const n = nodes.current;
    if (n.ctx.state !== "running") {
      try {
        await Promise.race([
          n.ctx.resume(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), RESUME_TIMEOUT_MS)),
        ]);
      } catch { /* valutato sotto dallo stato effettivo */ }
    }
    // nel frattempo l'utente ha chiesto altro: questo avvio non conta più
    if (token !== tokenRef.current) return false;
    if (n.ctx.state !== "running") {
      dispatch({ type: "PLAY_FAIL", token, reason: "blocked" });
      return false;
    }
    const t = n.ctx.currentTime;
    n.master.gain.cancelScheduledValues(t);
    n.master.gain.setTargetAtTime(params.current.volume / 100, t, 0.6);
    startKeepAlive();
    dispatch({ type: "PLAY_OK", token });
    try { wakeLock.current = await navigator.wakeLock?.request("screen"); } catch { /* non disponibile */ }
    // pausa arrivata mentre si attendeva il blocco schermo
    if (token !== tokenRef.current) await releaseWakeLock();
    return true;
  }, [build]);

  // Pausa dell'utente (type "REQUEST_PAUSE") o fine sessione per timer (type "FINISH").
  const halt = useCallback(async (type) => {
    const token = ++tokenRef.current;
    intentRef.current = type === "FINISH" ? "none" : "pause";
    dispatch({ type, token });
    const n = nodes.current;
    if (n) {
      const t = n.ctx.currentTime;
      n.master.gain.cancelScheduledValues(t);
      n.master.gain.setTargetAtTime(0, t, 0.25);
    }
    stopKeepAlive();
    await releaseWakeLock();
  }, []);

  const pause = useCallback(() => halt("REQUEST_PAUSE"), [halt]);
  const finish = useCallback(() => halt("FINISH"), [halt]);

  // dopo una telefonata, un allarme o il ritorno in primo piano iOS può lasciare
  // il contesto "interrupted" o "suspended": se l'utente vuole ascoltare, si tenta la ripresa.
  // L'esito arriva da onstatechange; se serve un tocco, lo stato resta "interrupted".
  useEffect(() => {
    const revive = async () => {
      const n = nodes.current;
      if (!n || intentRef.current !== "play" || n.ctx.state === "running") return;
      try { await n.ctx.resume(); } catch { /* serve un tocco dell'utente */ }
      if (intentRef.current !== "play") return;
      startKeepAlive();
      if (document.visibilityState === "visible" && !wakeLock.current) {
        try { wakeLock.current = await navigator.wakeLock?.request("screen"); } catch { /* ignora */ }
      }
    };
    const onVisible = () => {
      // il blocco schermo viene rilasciato quando la pagina si nasconde
      if (document.visibilityState === "hidden") wakeLock.current = null;
      revive();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", revive);
    window.addEventListener("focus", revive);
    const timer = setInterval(revive, 3000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", revive);
      window.removeEventListener("focus", revive);
      clearInterval(timer);
    };
  }, []);

  // chiude il contesto audio quando il componente viene smontato
  useEffect(() => () => {
    nodes.current?.ctx.close();
    wakeLock.current?.release?.();
    stopKeepAlive();
  }, []);

  return { playback, play, pause, finish };
}
