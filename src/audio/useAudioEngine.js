import { useCallback, useEffect, useReducer, useRef } from "react";
import { makeNatureBufferAsync } from "./natureSounds.js";
import { makeNoiseBuffer } from "./noiseSounds.js";
import { createGraph, applyParams } from "./graph.js";
import { enablePlaybackSession, startKeepAlive, stopKeepAlive } from "./background.js";
import { initialPlayback, playbackReducer } from "./playbackState.js";
import { switchSource } from "./crossfade.js";
import { scheduleMaster, wallToAudio, FINAL_FADE_S } from "./masterSchedule.js";

// oltre questo tempo un resume() senza risposta conta come fallito
const RESUME_TIMEOUT_MS = 4000;
// dopo una pausa o la fine, il contesto audio viene sospeso per risparmiare batteria
const SUSPEND_AFTER_MS = 1500;
// quanti suoni della natura tenere in memoria (circa 8 MB ciascuno, 17 MB il temporale)
const NATURE_CACHE_SIZE = 3;

/**
 * Motore audio: due oscillatori sinusoidali in stereo (battimento binaurale)
 * più un rumore colorato e un suono della natura in loop.
 * Frequenze e volumi cambiano con transizioni morbide; il cambio di tipo di rumore
 * o di suono della natura usa una dissolvenza incrociata (crossfade.js).
 */
export function useAudioEngine({ beat, car, tone, noise, noiseType, nature, natureType, volume }, { beforeAutoResume } = {}) {
  const nodes = useRef(null);
  const wakeLock = useRef(null);
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback);
  const intentRef = useRef("none"); // copia sincrona dell'intenzione, per i gestori di eventi
  const tokenRef = useRef(0); // numero dell'ultima richiesta play/pausa
  const params = useRef({});
  params.current = { beat, car, tone, noise, nature, volume };
  // chiamata prima di ogni ripresa automatica: se restituisce false (es. timer scaduto), non si riprende
  const beforeAutoResumeRef = useRef(beforeAutoResume);
  beforeAutoResumeRef.current = beforeAutoResume;

  // Rumori: buffer piccoli e rapidi da generare (circa 20 ms), in cache per tipo.
  // `fade: false` al primo avvio; poi ogni cambio sfuma dal suono vecchio al nuovo.
  const startNoise = useCallback((type, fade = true) => {
    const n = nodes.current;
    if (!n) return;
    if (!(type in n.noiseCache)) n.noiseCache[type] = makeNoiseBuffer(n.ctx, type);
    switchSource(n.noiseSlot, n.noiseCache[type], { fade });
  }, []);

  // Natura: buffer grandi (fino a 17 MB e mezzo secondo di calcolo per il temporale).
  // Si generano a piccoli blocchi senza bloccare l'interfaccia; nel frattempo continua
  // il suono precedente, poi il nuovo entra in dissolvenza. In memoria restano solo
  // gli ultimi NATURE_CACHE_SIZE tipi usati.
  const startNature = useCallback((type, fade = true) => {
    const n = nodes.current;
    if (!n) return;
    const cache = n.natureCache;
    if (cache.has(type)) {
      const buf = cache.get(type);
      cache.delete(type); cache.set(type, buf); // segna come usato di recente
      switchSource(n.natureSlot, buf, { fade });
      return;
    }
    if (!n.natureLoading.has(type)) {
      n.natureLoading.set(type, makeNatureBufferAsync(n.ctx, type).then((buf) => {
        n.natureLoading.delete(type);
        cache.set(type, buf);
        while (cache.size > NATURE_CACHE_SIZE) {
          const oldest = cache.keys().next().value;
          if (oldest === n.natureType) break; // mai togliere quello in ascolto
          cache.delete(oldest);
        }
        return buf;
      }));
    }
    n.natureLoading.get(type).then((buf) => {
      // nel frattempo l'utente può aver scelto un altro suono: si usa solo l'ultimo
      if (nodes.current === n && n.natureType === type) switchSource(n.natureSlot, buf, { fade: true });
    }).catch(() => { n.natureLoading.delete(type); });
  }, []);

  const build = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("unsupported");
    const ctx = new Ctx();
    // sospensioni e interruzioni decise dal sistema (telefonate, altre app, Siri)
    ctx.onstatechange = () => dispatch({ type: "CONTEXT_STATE", state: ctx.state });
    const graph = createGraph(ctx, ctx.destination);
    nodes.current = {
      ...graph,
      noiseType, natureType, noiseCache: {}, natureCache: new Map(), natureLoading: new Map(),
      endAudio: null, // scadenza del timer nel clock audio
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
      scheduleMaster(n.master.gain, n.ctx.currentTime, volume / 100, n.endAudio);
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
    const lock = wakeLock.current;
    wakeLock.current = null;
    try { await lock?.release(); } catch { /* ignora */ }
  };

  // Tiene acceso lo schermo solo mentre l'audio suona davvero e la pagina è visibile.
  // Il sistema lo rilascia da solo quando la pagina si nasconde: l'evento "release" lo segnala.
  const acquireWakeLock = async () => {
    const n = nodes.current;
    if (wakeLock.current || !navigator.wakeLock || document.visibilityState !== "visible") return;
    if (!n || n.ctx.state !== "running" || intentRef.current !== "play") return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (intentRef.current !== "play") { lock.release().catch(() => {}); return; }
      wakeLock.current = lock;
      lock.addEventListener?.("release", () => { if (wakeLock.current === lock) wakeLock.current = null; });
    } catch { /* non consentito o non supportato */ }
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
    scheduleMaster(n.master.gain, n.ctx.currentTime, params.current.volume / 100, n.endAudio, 0.6);
    startKeepAlive();
    dispatch({ type: "PLAY_OK", token });
    await acquireWakeLock();
    return true;
  }, [build]);

  // Pausa dell'utente (type "REQUEST_PAUSE") o fine sessione per timer (type "FINISH").
  const halt = useCallback(async (type) => {
    const token = ++tokenRef.current;
    intentRef.current = type === "FINISH" ? "none" : "pause";
    dispatch({ type, token });
    const n = nodes.current;
    if (n) {
      n.endAudio = null;
      scheduleMaster(n.master.gain, n.ctx.currentTime, 0, null, 0.25);
      // a dissolvenza finita il contesto si sospende, se nel frattempo non si è ripreso
      setTimeout(() => {
        if (tokenRef.current === token && n.ctx.state === "running") n.ctx.suspend().catch(() => {});
      }, SUSPEND_AFTER_MS);
    }
    stopKeepAlive();
    await releaseWakeLock();
  }, []);

  const pause = useCallback(() => halt("REQUEST_PAUSE"), [halt]);
  const finish = useCallback(() => halt("FINISH"), [halt]);

  // Scadenza del timer (millisecondi di orologio, oppure null): viene scritta nel clock audio,
  // così la dissolvenza finale avviene in orario anche con il JavaScript rallentato.
  const setSessionEnd = useCallback((endAtMs) => {
    const n = nodes.current;
    if (!n) return;
    n.endAudio = endAtMs == null ? null : wallToAudio(endAtMs, Date.now(), n.ctx.currentTime);
    if (intentRef.current === "play" && n.ctx.state === "running") {
      scheduleMaster(n.master.gain, n.ctx.currentTime, params.current.volume / 100, n.endAudio);
    }
  }, []);

  // dopo una telefonata, un allarme o il ritorno in primo piano iOS può lasciare
  // il contesto "interrupted" o "suspended": se l'utente vuole ascoltare, si tenta la ripresa.
  // L'esito arriva da onstatechange; se serve un tocco, lo stato resta "interrupted".
  useEffect(() => {
    let busy = false;
    const revive = async () => {
      const n = nodes.current;
      if (!n || intentRef.current !== "play" || busy) return;
      // prima di tutto: una sessione scaduta mentre la pagina era sospesa non deve ripartire
      if (beforeAutoResumeRef.current && beforeAutoResumeRef.current() === false) return;
      busy = true;
      try {
        if (n.ctx.state !== "running") {
          try { await n.ctx.resume(); } catch { /* serve un tocco: lo stato resta "interrupted" */ }
          if (intentRef.current !== "play") return;
          if (n.ctx.state === "running") startKeepAlive();
        }
        // anche se l'audio non si era mai fermato, il blocco schermo va riacquisito
        await acquireWakeLock();
      } finally {
        busy = false;
      }
    };
    document.addEventListener("visibilitychange", revive);
    window.addEventListener("pageshow", revive);
    window.addEventListener("focus", revive);
    // controllo periodico di riserva: in background i timer sono rallentati, ma quando
    // girano riconciliano scadenza e stato
    const id = setInterval(revive, 3000);
    return () => {
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("pageshow", revive);
      window.removeEventListener("focus", revive);
      clearInterval(id);
    };
  }, []);

  // chiude il contesto audio quando il componente viene smontato
  useEffect(() => () => {
    nodes.current?.ctx.close();
    wakeLock.current?.release?.();
    stopKeepAlive();
  }, []);

  return { playback, play, pause, finish, setSessionEnd, finalFadeSeconds: FINAL_FADE_S };
}
