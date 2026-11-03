// Cursore con etichetta e valore.
// `context` completa il nome per gli screen reader quando l'etichetta visibile è generica
// (es. "Volume" nella sezione "Rumore di fondo" viene letto "Volume, rumore di fondo").
// `describedBy` collega un testo di spiegazione (es. la banda delle onde).
export default function Slider({ id, label, context, value, min, max, step = 1, unit = "", onChange, describedBy }) {
  const valueText = `${value}${unit}`.trim();
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
      <output htmlFor={id} aria-hidden="true">{valueText}</output>
    </div>
  );
}
