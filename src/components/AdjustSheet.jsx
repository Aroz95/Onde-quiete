import { useEffect, useRef, useState } from "react";
import Slider from "./Slider.jsx";
import Pills from "./Pills.jsx";
import { NOISE_LABELS, NATURE_SHORT, TIMER_OPTIONS, bandOf } from "../presets.js";

const noiseOptions = Object.entries(NOISE_LABELS).map(([value, label]) => ({ value, label }));
const natureOptions = Object.entries(NATURE_SHORT).map(([value, label]) => ({ value, label }));
const timerOptions = TIMER_OPTIONS.map((o) => ({ value: o.value, label: o.short }));

function Section({ title, children }) {
  return (
    <section className="sheet-section">
      <h3 className="label">{title}</h3>
      <div className="sheet-card">{children}</div>
    </section>
  );
}

// I controlli cambiano in base al tipo di suono: si mostra solo ciò che ha effetto.
function SoundControls({ kind, s, set }) {
  const noise = (title) => (
    <Section title={title}>
      <Pills label="Colore" options={noiseOptions} value={s.noiseType} onChange={set("noiseType")} />
      <Slider id="noise" label="Volume" value={s.noise} min={0} max={100} unit="%" onChange={set("noise")} />
    </Section>
  );
  const nature = (title) => (
    <Section title={title}>
      <Pills label="Suono" options={natureOptions} value={s.natureType} onChange={set("natureType")} />
      <Slider id="nature" label="Volume" value={s.nature} min={0} max={100} unit="%" onChange={set("nature")} />
    </Section>
  );

  if (kind === "binaural") {
    return (
      <>
        <Section title="Onda binaurale">
          <Slider id="beat" label="Battimento" value={s.beat} min={0.5} max={40} step={0.5} unit=" Hz" onChange={set("beat")} />
          <p className="field-hint">{bandOf(s.beat)}: la differenza tra le due orecchie</p>
          <Slider id="car" label="Portante" value={s.car} min={80} max={500} unit=" Hz" onChange={set("car")} />
          <Slider id="tone" label="Volume" value={s.tone} min={0} max={100} unit="%" onChange={set("tone")} />
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
          <Slider id="nature" label="Intensità" value={s.nature} min={0} max={100} unit="%" onChange={set("nature")} />
        </Section>
        {noise("Rumore di fondo")}
      </>
    );
  }
  // solfeggio
  return (
    <>
      <Section title={`Tono a ${s.car} Hz`}>
        <Slider id="tone" label="Volume" value={s.tone} min={0} max={100} unit="%" onChange={set("tone")} />
      </Section>
      {nature("Sottofondo")}
    </>
  );
}

export default function AdjustSheet({
  open, onClose, kind, settings, onSet, modified, onReset,
  volume, onVolume, timerMin, onTimer, remaining, timerPaused,
}) {
  const sheetRef = useRef(null);
  const layerRef = useRef(null);

  // da chiuso il pannello non deve ricevere né focus né tocchi
  useEffect(() => {
    if (layerRef.current) layerRef.current.inert = !open;
  }, [open]);
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);

  // Esc per chiudere, niente scorrimento della pagina sotto il pannello
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("sheet-open");
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("sheet-open");
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

  return (
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
              Ripristina
            </button>
            <h2 id="sheet-title">{settings.name}</h2>
            <button type="button" className="text-btn strong" onClick={onClose}>Fine</button>
          </div>
        </div>

        <div className="sheet-body">
          <SoundControls kind={kind} s={settings} set={set} />

          <Section title="Generale">
            <Slider id="vol" label="Volume" value={volume} min={0} max={100} unit="%" onChange={onVolume} />
            <Pills label="Spegni dopo" options={timerOptions} value={timerMin} onChange={onTimer} />
            {remaining && (
              <p className="field-hint">
                {timerPaused ? `In pausa: restano ${remaining}` : `Si spegne tra ${remaining}`}
              </p>
            )}
          </Section>

          <p className="note">
            Le modifiche valgono solo per {settings.name} e vengono ricordate. I battimenti binaurali funzionano solo in
            cuffia; le ricerche sui benefici danno risultati contrastanti, quindi usala come sottofondo e non come terapia.
            Su iPhone l'ascolto a schermo bloccato richiede iOS 17.5 o successivo. <b>Non usarla alla guida.</b>
          </p>
        </div>
      </div>
    </div>
  );
}
