// Gruppo di scelte a pillole (una sola selezionata), più comodo di un menu a tendina sul telefono.
export default function Pills({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span className="field-label" id={`pl-${label}`}>{label}</span>
      <div className="pills" role="radiogroup" aria-labelledby={`pl-${label}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className="pill"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
