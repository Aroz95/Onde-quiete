import { useEffect, useState } from "react";
import { PRESETS, NOISE_LABELS, TIMER_OPTIONS, bandOf } from "./presets.js";
import { useAudioEngine } from "./audio/useAudioEngine.js";
import Scope from "./components/Scope.jsx";
import Slider from "./components/Slider.jsx";

const CUSTOM_COLOR = "#7fd1c4";

export default function App() {
  const [settings, setSettings] = useState({ ...PRESETS[0] });
  const [volume, setVolume] = useState(70);
  const [timerMin, setTimerMin] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [remaining, setRemaining] = useState("");

  const { playing, setRunning } = useAudioEngine({ ...settings, volume });

  const update = (key) => (value) =>
    setSettings((s) => ({ ...s, [key]: value, id: "custom", name: "Personalizzato", color: CUSTOM_COLOR }));

  const choosePreset = (p) => {
    setSettings({ ...p });
    if (!playing) start();
  };

  const start = () => {
    setRunning(true);
    setEndAt(timerMin ? Date.now() + timerMin * 60000 : 0);
  };
  const stop = () => {
    setRunning(false);
    setEndAt(0);
    setRemaining("");
  };

  const changeTimer = (m) => {
    setTimerMin(m);
    setEndAt(m && playing ? Date.now() + m * 60000 : 0);
    if (!m) setRemaining("");
  };

  // conto alla rovescia dello spegnimento automatico
  useEffect(() => {
    if (!endAt || !playing) return;
    const id = setInterval(() => {
      const ms = endAt - Date.now();
      if (ms <= 0) {
        stop();
        return;
      }
      const s = Math.ceil(ms / 1000);
      setRemaining(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt, playing]);

  const hasTone = settings.tone > 0;

  return (
    <main className="wrap">
      <header>
        <h1>Onde Quiete</h1>
        <span className="hint">🎧 usa le cuffie</span>
      </header>

      <div className="scope">
        <Scope {...settings} playing={playing} />
        <div className="readout">
          <div>
            <div className="mode">{settings.name}</div>
            <div className="band">{hasTone ? bandOf(settings.beat) : "solo rumore"}</div>
          </div>
          <div className="hz">
            <span>{hasTone ? `${settings.beat} Hz` : "—"}</span>
            <small>
              {hasTone ? `portante ${settings.car} Hz` : `rumore ${NOISE_LABELS[settings.noiseType].toLowerCase()}`}
            </small>
          </div>
        </div>
      </div>

      <button type="button" className={`play${playing ? " on" : ""}`} onClick={playing ? stop : start}>
        {playing ? "❚❚ Pausa" : "▶ Avvia"}
      </button>

      <section>
        <p className="label">Scegli l'esigenza</p>
        <div className="grid">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              aria-pressed={settings.id === p.id}
              onClick={() => choosePreset(p)}
            >
              <i style={{ background: p.color }} />
              <b>{p.name}</b>
              <span>{p.tone ? `${p.beat} Hz` : `rumore ${p.noiseType === "brown" ? "marrone" : p.noiseType === "pink" ? "rosa" : "bianco"}`}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ctrl">
        <Slider id="beat" label="Battimento" value={settings.beat} min={0.5} max={40} step={0.5} unit=" Hz" onChange={update("beat")} />
        <Slider id="car" label="Portante" value={settings.car} min={80} max={500} unit=" Hz" onChange={update("car")} />
        <Slider id="tone" label="Volume tono" value={settings.tone} min={0} max={100} unit="%" onChange={update("tone")} />
        <Slider id="noise" label="Rumore" value={settings.noise} min={0} max={100} unit="%" onChange={update("noise")} />
        <div className="row">
          <label htmlFor="ntype">Tipo rumore</label>
          <select id="ntype" className="span2" value={settings.noiseType} onChange={(e) => update("noiseType")(e.target.value)}>
            {Object.entries(NOISE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <Slider id="vol" label="Volume" value={volume} min={0} max={100} unit="%" onChange={setVolume} />
      </section>

      <div className="timer">
        <label htmlFor="timer" className="note">Spegnimento automatico</label>
        <select id="timer" value={timerMin} onChange={(e) => changeTimer(Number(e.target.value))}>
          {TIMER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="note">{remaining}</span>
      </div>

      <p className="note">
        I battimenti binaurali funzionano solo in cuffia: ogni orecchio riceve una frequenza diversa e il cervello
        percepisce la differenza. Tieni il volume basso. <b>Non usarlo alla guida.</b>
      </p>
    </main>
  );
}
