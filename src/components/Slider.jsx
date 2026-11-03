export default function Slider({ id, label, value, min, max, step = 1, unit, onChange }) {
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
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id}>
        {value}
        {unit}
      </output>
    </div>
  );
}
