import { useId, useRef } from "react";

// Gruppo di scelte a pillole (una sola selezionata), più comodo di un menu a tendina sul telefono.
// Segue lo schema dei radio button: un solo tasto Tab per entrare nel gruppo,
// frecce per spostarsi tra le opzioni.
export default function Pills({ label, context, options, value, onChange, onCommit, className = "" }) {
  const id = useId();
  const refs = useRef([]);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = dir == null ? null : (selected + dir + options.length) % options.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = options.length - 1;
    if (next == null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="field">
      <span className="field-label" id={id}>{label}</span>
      <div
        className={`pills ${className}`.trim()}
        role="radiogroup"
        aria-labelledby={context ? undefined : id}
        aria-label={context ? `${label}, ${context}` : undefined}
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={i === selected ? 0 : -1}
            aria-label={o.srLabel}
            className="pill"
            onClick={() => { onChange(o.value); onCommit?.(o.value); }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
