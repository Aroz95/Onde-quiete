// Interruttore acceso/spento, letto dagli screen reader come "interruttore, attivo/non attivo".
export default function Switch({ id, label, checked, onChange, describedBy }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch-label">{label}</span>
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    </button>
  );
}
