// Stato di riproduzione (ticket OQ-05): separa l'intenzione dell'utente dallo stato audio reale.
//
// intent:  "play" | "pause" | "none"      cosa ha chiesto l'utente
// status:  "idle"        nessuna sessione
//          "starting"    avvio richiesto, audio non ancora confermato
//          "playing"     il contesto audio sta davvero suonando
//          "paused"      messo in pausa dall'utente
//          "interrupted" l'utente vuole ascoltare ma l'audio è fermo (sistema, telefonata,
//                        browser che chiede un nuovo tocco): serve "Riprendi"
//          "unsupported" il browser non può generare l'audio
// token:   numero della richiesta più recente; un avvio che si conclude dopo una richiesta
//          successiva (es. pausa durante l'avvio) viene ignorato

export const initialPlayback = { intent: "none", status: "idle", token: 0, reason: null };

export function playbackReducer(s, a) {
  if (s.status === "unsupported" && a.type !== "RESET") return s;
  switch (a.type) {
    case "REQUEST_PLAY":
      return { intent: "play", status: "starting", token: a.token, reason: null };
    case "PLAY_OK":
      if (a.token !== s.token || s.intent !== "play") return s;
      return { ...s, status: "playing", reason: null };
    case "PLAY_FAIL":
      if (a.token !== s.token || s.intent !== "play") return s;
      if (a.reason === "unsupported") return { ...s, intent: "none", status: "unsupported", reason: a.reason };
      return { ...s, status: "interrupted", reason: a.reason || "blocked" };
    case "REQUEST_PAUSE":
      return {
        intent: "pause",
        status: s.status === "idle" ? "idle" : "paused",
        token: a.token,
        reason: null,
      };
    case "FINISH":
      return { intent: "none", status: "idle", token: a.token, reason: null };
    case "CONTEXT_STATE":
      // eventi del sistema audio: contano solo se l'utente vuole ascoltare
      if (s.intent !== "play" || s.status === "starting") return s;
      if (a.state === "running") return { ...s, status: "playing", reason: null };
      return { ...s, status: "interrupted", reason: "system" };
    case "RESET":
      return initialPlayback;
    default:
      return s;
  }
}

// cosa mostrare sul pulsante principale
export function playButton(s, hasResidual) {
  switch (s.status) {
    case "playing":
      return { label: "❚❚ Pausa", action: "pause" };
    case "starting":
      return { label: "Avvio…", action: "pause" };
    case "interrupted":
      return { label: "▶ Riprendi", action: "play" };
    case "paused":
      return { label: "▶ Riprendi", action: "play" };
    case "unsupported":
      return { label: "Audio non disponibile", action: null };
    default:
      return { label: hasResidual ? "▶ Riprendi" : "▶ Avvia", action: "play" };
  }
}

export function playbackMessage(s) {
  if (s.status === "unsupported") return "Questo browser non può generare l'audio. Prova con Safari o Chrome aggiornati.";
  if (s.status === "interrupted") {
    return s.reason === "system"
      ? "L'audio è stato interrotto dal sistema. Tocca Riprendi per riattivare l'audio."
      : "Il browser non ha avviato l'audio. Tocca Riprendi per riattivare l'audio.";
  }
  return "";
}
