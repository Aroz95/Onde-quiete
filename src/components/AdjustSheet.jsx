import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Slider from "./Slider.jsx";
import Pills from "./Pills.jsx";
import EnvControls from "./EnvControls.jsx";
import { NOISE_LABELS, NATURE_SHORT, bandOf } from "../presets.js";
import { describeMix } from "../mixDescription.js";

const noiseOptions = Object.entries(NOISE_LABELS).map(([value, label]) => ({ value, label }));
const natureOptions = Object.entries(NATURE_SHORT).map(([value, label]) => ({ value, label }));
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function Section({ title, children }) {
  const id = useId();
  return (
    <section className="sheet-section" aria-labelledby={id}>
      <h3 className="label" id={id}>{title}</h3>
      <div className="sheet-card">{children}</div>
    </section>
  );
}

// I controlli cambiano in base al tipo di suono: si mostra solo ciò che ha effetto.
function SoundControls({ kind, s, set }) {
  const ctx = (title) => title.toLowerCase();
  const noise = (title) => (
    <Section title={title}>
      <Pills label="Colore" context={ctx(title)} options={noiseOptions} value={s.noiseType} onChange={set("noiseType")} />
      <Slider id="noise" label="Livello" context={ctx(title)} value={s.noise} min={0} max={100} unit="%" onChange={set("noise")} />
    </Section>
  );
  const nature = (title) => (
    <Section title={title}>
      <Pills label="Suono" context={ctx(title)} options={natureOptions} value={s.natureType} onChange={set("natureType")} />
      <Slider id="nature" label="Livello" context={ctx(title)} value={s.nature} min={0} max={100} unit="%" onChange={set("nature")} />
    </Section>
  );

  if (kind === "binaural") {
    return (
      <>
        <Section title="Onda binaurale">
          <Slider id="beat" label="Battimento" value={s.beat} min={0.5} max={40} step={0.5} unit=" Hz" onChange={set("beat")} describedBy="beat-hint" />
          <p className="field-hint" id="beat-hint">{bandOf(s.beat)}: la differenza tra le due orecchie</p>
          <Slider id="car" label="Portante" value={s.car} min={80} max={500} unit=" Hz" onChange={set("car")} />
          <Slider id="tone" label="Livello" context="onda binaurale" value={s.tone} min={0} max={100} unit="%" onChange={set("tone")} />
        </Section>
        {noise("Rumore di fondo")}
        {nature("Natura di fondo")}
      </>
    );
  }
  if (kind === "noise") {
    return (
      <>
        {noise("Rumore")}
        {nature("Natura di fondo")}
      </>
    );
  }
  if (kind === "nature") {
    return (
      <>
        <Section title="Natura">
          <Slider id="nature" label="Intensità" context="natura" value={s.nature} min={0} max={100} unit="%" onChange={set("nature")} />
        </Section>
        {noise("Rumore di fondo")}
      </>
    );
  }
  // solfeggio
  return (
    <>
      <Section title={`Tono a ${s.car} Hz`}>
        <Slider id="tone" label="Livello" context={`tono a ${s.car} hertz`} value={s.tone} min={0} max={100} unit="%" onChange={set("tone")} />
      </Section>
      {nature("Sottofondo")}
    </>
  );
}

export default function AdjustSheet({
  open, onClose, kind, settings, onSet, modified, onReset,
  env = null, // ambiente naturale: { id, config, onSet, onQuick, status, onRetry, summary, title }
}) {
  const sheetRef = useRef(null);
  const layerRef = useRef(null);

  // da chiuso il pannello non deve ricevere né focus né tocchi
  useEffect(() => {
    if (layerRef.current) layerRef.current.inert = !open;
  }, [open]);
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);

  // Comportamento modale (OQ-04): a pannello aperto
  //  - il resto dell'app è inerte: niente tastiera, tocchi o lettura da screen reader
  //  - Tab e Maiusc+Tab girano solo tra i controlli del pannello
  //  - Esc chiude; alla chiusura il focus torna a chi aveva aperto il pannello
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const app = document.getElementById("root");
    if (app) { app.inert = true; app.setAttribute("aria-hidden", "true"); }
    document.body.classList.add("sheet-open");
    // il focus va sul pannello stesso, che ha il titolo: lo screen reader lo annuncia
    sheetRef.current?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      // solo ciò che il Tab raggiunge davvero: visibile e senza tabindex negativo
      // (le pillole non selezionate si raggiungono con le frecce, non con il Tab)
      const items = [...sheetRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null && el.tabIndex >= 0);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const inside = sheetRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === sheetRef.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("sheet-open");
      if (app) { app.inert = false; app.removeAttribute("aria-hidden"); }
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  // trascina verso il basso per chiudere, come su iOS
  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    setDrag(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (drag > 90) onClose();
    setDrag(0);
    startY.current = null;
  };

  const set = (key) => (value) => onSet(key, value);

  // il pannello sta fuori dall'app (portale su <body>), così l'app intera può diventare inerte
  return createPortal(
    <div ref={layerRef} className={`sheet-layer${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
      >
        <div className="sheet-head" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <span className="grabber" aria-hidden="true" />
          <div className="sheet-bar">
            <button type="button" className="text-btn" onClick={onReset} disabled={!modified}>
              Ripristina<span className="sr-only"> i valori originali di {settings.name}</span>
            </button>
            <h2 id="sheet-title">{env ? env.title : <><span className="sr-only">Regola </span>{settings.name}</>}</h2>
            <button type="button" className="text-btn strong" onClick={onClose} aria-label="Fine, chiudi le regolazioni">
              Fine
            </button>
          </div>
        </div>

        <div className="sheet-body">
          {/* cosa si sente ora, aggiornato mentre si regola */}
          <p className="sheet-summary" aria-live="polite">{env ? env.summary : describeMix(settings)}</p>

          {env ? (
            <EnvControls
              envId={env.id}
              config={env.config}
              onSet={env.onSet}
              onQuick={env.onQuick}
              customized={modified}
              status={env.status}
              onRetry={env.onRetry}
            />
          ) : (
            <SoundControls kind={kind} s={settings} set={set} />
          )}

          <p className="note">
            Le modifiche valgono solo per {settings.name} e restano salvate su questo dispositivo.
            Volume generale e timer sono nella schermata principale.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
