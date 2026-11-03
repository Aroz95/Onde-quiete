// Accorgimenti per continuare a suonare con lo schermo bloccato o con l'app in background,
// soprattutto su iPhone quando la pagina è aggiunta alla schermata Home.

// Dice al sistema che questo è audio "da ascolto" come musica o podcast:
// su iOS 17.5+ evita che il Web Audio venga sospeso in background
// e lo fa suonare anche con l'interruttore silenzioso attivo.
export function enablePlaybackSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== "playback") {
      navigator.audioSession.type = "playback";
    }
  } catch {
    /* API non disponibile: si prosegue senza */
  }
}

// Un elemento <audio> silenzioso in loop tiene aperta la sessione media del sistema
// sui browser che non supportano audioSession.
let keepAliveEl = null;

function silentWavUrl(seconds = 2, sampleRate = 8000) {
  const samples = seconds * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export function startKeepAlive() {
  try {
    if (!keepAliveEl) {
      keepAliveEl = new Audio(silentWavUrl());
      keepAliveEl.loop = true;
      keepAliveEl.setAttribute("playsinline", "");
    }
    const p = keepAliveEl.play();
    if (p) p.catch(() => {});
  } catch {
    /* ignora */
  }
}

export function stopKeepAlive() {
  try {
    keepAliveEl?.pause();
  } catch {
    /* ignora */
  }
}

// Controlli e titolo nella schermata di blocco e nel Centro di controllo.
export function updateMediaSession({ title, subtitle, playing, onPlay, onPause }) {
  const ms = navigator.mediaSession;
  if (!ms) return;
  try {
    ms.metadata = new window.MediaMetadata({
      title,
      artist: subtitle,
      album: "Onde Quiete",
      artwork: [
        { src: new URL("icon-192.png", document.baseURI).href, sizes: "192x192", type: "image/png" },
        { src: new URL("icon-512.png", document.baseURI).href, sizes: "512x512", type: "image/png" },
      ],
    });
    ms.playbackState = playing ? "playing" : "paused";
    ms.setActionHandler("play", onPlay);
    ms.setActionHandler("pause", onPause);
    ms.setActionHandler("stop", onPause);
  } catch {
    /* alcune azioni non sono supportate su tutti i browser */
  }
}
