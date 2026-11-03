// Cursore con etichetta e valore.
// `context` completa il nome per gli screen reader quando l'etichetta visibile è generica
// (es. "Volume" nella sezione "Rumore di fondo" viene letto "Volume, rumore di fondo").
// `describedBy` collega un testo di spiegazione (es. la banda delle onde).
// `display` sostituisce il valore mostrato e letto (es. "Intensa" invece di "70").
export default function Slider({ id, label, context, value, min, max, step = 1, unit = "", onChange, describedBy, display }) {
  const valueText = display ?? `${value}${unit}`.trim();
  return (
    <div className="row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={context ? `${label}, ${context}` : undefined}
        aria-valuetext={valueText}
        aria-describedby={describedBy}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {/* i valori a parole (es. "Occasionali") usano il carattere normale, i numeri il monospaziato */}
      <output htmlFor={id} aria-hidden="true" className={/\d/.test(valueText) ? undefined : valueText.length > 10 ? "word long" : "word"}>{valueText}</output>
    </div>
  );
}
