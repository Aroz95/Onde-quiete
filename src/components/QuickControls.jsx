import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icons.jsx";
import Pills from "./Pills.jsx";
import { TIMER_OPTIONS } from "../presets.js";

// Volume generale e timer sempre a portata di mano sotto Avvia (ticket OQ-06).
// Condividono lo stato con il resto dell'app: non sono una copia dei controlli.

const timerOptions = TIMER_OPTIONS.map((o) => ({
  value: o.value,
  label: o.value ? `${o.value} min` : "No",
  srLabel: o.value ? `${o.value} minuti` : "nessun timer",
}));

export function timerLabel({ durationMin, remaining, running }) {
  if (!durationMin) return "Timer disattivato";
  if (remaining) return running ? `Si spegne tra ${remaining}` : `In pausa · restano ${remaining}`;
  return `Timer ${durationMin} min`;
}

export default function QuickControls({ volume, onVolume, timerMin, onTimer, remaining, running }) {
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const popId = useId();
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // chiude la scelta del timer toccando fuori o con Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!popRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // il focus entra sulla scelta attuale
    popRef.current?.querySelector('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (m) => {
    onTimer(m);
    setAnnounce(m ? `Timer impostato su ${m} minuti` : "Timer disattivato");
  };

  const label = timerLabel({ durationMin: timerMin, remaining, running });

  return (
    <div className="quick">
      <div className="quick-row">
        <label className="quick-vol" htmlFor="main-volume">
          <Icon name="volume" />
          <span className="sr-only">Volume generale</span>
          <input
            id="main-volume"
            type="range"
            min={0}
            max={100}
            value={volume}
            aria-valuetext={`${volume}%`}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span className="quick-value" aria-hidden="true">{volume}%</span>
        </label>

        <button
          ref={btnRef}
          type="button"
          className={`timer-btn${timerMin ? " set" : ""}`}
          aria-expanded={open}
          aria-controls={popId}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="clock" />
          {/* il conto alla rovescia cambia ogni secondo: non viene annunciato */}
          <span className="timer-text">{label}</span>
        </button>
      </div>

      <div id={popId} ref={popRef} className="timer-pop" hidden={!open}>
        <Pills
          label="Spegni dopo"
          options={timerOptions}
          value={timerMin}
          onChange={pick}
          onCommit={() => { setOpen(false); btnRef.current?.focus(); }}
        />
        <p className="field-hint">
          Alla scadenza il suono sfuma in 8 secondi. La pausa ferma anche il timer.
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </div>
  );
}
