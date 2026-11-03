// Barra delle schede in basso, nello stile della tab bar di iOS.

const ICONS = {
  // onde sovrapposte: le esigenze (relax, concentrazione, sonno...)
  needs: (
    <>
      <path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0 2 3 2 3" />
      <path d="M2 17c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" opacity=".5" />
    </>
  ),
  // foglia: suoni della natura
  nature: (
    <>
      <path d="M5 19c-1-7 4-14 15-14 0 10-6 15-13 14" />
      <path d="M5 19c3-4 6-7 10-9" />
    </>
  ),
  // diapason: frequenze Solfeggio
  solfeggio: (
    <>
      <path d="M9 3v8a3 3 0 0 0 6 0V3" />
      <path d="M12 14v7" />
      <path d="M10 21h4" />
    </>
  ),
  // cursori: regolazioni
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
};

export default function TabBar({ tabs, active, onChange, playing }) {
  return (
    <nav className="tabbar" aria-label="Sezioni">
      <div className="tabbar-inner" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            className="tab"
            onClick={() => onChange(t.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t.id]}</svg>
            <span>{t.label}</span>
            {t.hasCurrent && playing && <i className="tab-dot" aria-label="in riproduzione" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
