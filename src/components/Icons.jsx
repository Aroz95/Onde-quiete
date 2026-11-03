// Icone a tratto, tutte su griglia 24×24. Ereditano il colore dal testo (currentColor).

const PATHS = {
  // pioggia: nuvola e gocce
  rain: (
    <>
      <path d="M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.5 8 3.5 3.5 0 0 1 17 15H7Z" />
      <path d="M8 18.5 7 21M12 18.5 11 21M16 18.5 15 21" />
    </>
  ),
  // onde del mare
  waves: (
    <>
      <path d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" />
      <path d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" />
    </>
  ),
  // vento: tre raffiche con riccioli
  wind: (
    <>
      <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h16a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h7" />
    </>
  ),
  // camino: fiamma
  fire: (
    <>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.4 2.6-5.2 3.6-8.5 1.8 1.4 2.4 3 2.4 4.5 1-.6 1.8-1.7 2-3 2 1.8 3 4 3 7 0 3.4-2.6 6-4.5 6Z" />
      <path d="M12 21c-1.5 0-2.5-1-2.5-2.5S11 16 12 14.5c1 1.5 2.5 2.5 2.5 4S13.5 21 12 21Z" />
    </>
  ),
  // temporale: nuvola e fulmine
  storm: (
    <>
      <path d="M7 14a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.5 7 3.5 3.5 0 0 1 17 14" />
      <path d="M12.5 12 10 17h3.5L11 22" />
    </>
  ),
  // cuffie: preset binaurali
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  // diapason: frequenze Solfeggio
  fork: (
    <>
      <path d="M9 3v8a3 3 0 0 0 6 0V3" />
      <path d="M12 14v7M10 21h4" />
    </>
  ),
  // rumore: barre irregolari
  noise: <path d="M4 10v4M7.5 7v10M11 9v6M14.5 5v14M18 8v8M21 11v2" />,
  // altoparlante: volume generale
  volume: (
    <>
      <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  // orologio: timer
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // spunta: elemento selezionato
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  // cursori: regolazioni
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
};

export default function Icon({ name, className = "" }) {
  return (
    <svg className={`icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** Icona che rappresenta un preset nella sua tessera. */
export function presetIcon(kind, preset) {
  if (kind === "nature") return preset.natureType;
  if (kind === "solfeggio") return "fork";
  if (kind === "noise") return "noise";
  return "headphones";
}
