import { useEffect, useState } from "react";
import {
  PRESETS, PRESET_GROUPS, NOISE_LABELS, NATURE_LABELS, TIMER_OPTIONS, bandOf, presetSubtitle,
} from "./presets.js";
import { useAudioEngine } from "./audio/useAudioEngine.js";
import { updateMediaSession } from "./audio/background.js";
import Scope from "./components/Scope.jsx";
import Slider from "./components/Slider.jsx";

const CUSTOM_COLOR = "#7fd1c4";

// cosa mostrare in grande nel riquadro dell'oscilloscopio
function describe(s) {
  if (s.tone > 0 && s.beat > 0) {
    return { band: bandOf(s.beat), big: `${s.beat} Hz`, small: `portante ${s.car} Hz` };
  }
  if (s.tone > 0) {
    return { band: "tono puro", big: `${s.car} Hz`, small: s.nature > 0 ? NATURE_LABELS[s.natureType].toLowerCase() : "sinusoide" };
  }
  if (s.nature > 0) {
    return { band: "natura", big: "—", small: NATURE_LABELS[s.natureType].toLowerCase() };
  }
  return { band: "solo rumore", big: "—", small: `rumore ${NOISE_LABELS[s.noiseType].toLowerCase()}` };
}

export default function App() {
  const [settings, setSettings] = useState({ ...PRESETS[0] });
  const [volume, setVolume] = useState(70);
  const [timerMin, setTimerMin] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [remaining, setRemaining] = useState("");

  const { playing, setRunning } = useAudioEngine({ ...settings, volume });

  const update = (key) => (value) =>
    setSettings((s) => ({ ...s, [key]: value, id: "custom", name: "Personalizzato", color: CUSTOM_COLOR }));

  const start = () => {
    setRunning(true);
    setEndAt(timerMin ? Date.now() + timerMin * 60000 : 0);
  };
  const stop = () => {
    setRunning(false);
    setEndAt(0);
    setRemaining("");
  };

  const choosePreset = (p) => {
    setSettings({ ...p });
    if (!playing) start();
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

  const info = describe(settings);

  // titolo e pulsanti play/pausa nella schermata di blocco
  useEffect(() => {
    updateMediaSession({
      title: settings.name,
      subtitle: info.big !== "—" ? `${info.band} · ${info.big}` : info.small,
      playing,
      onPlay: start,
      onPause: stop,
    });
  });

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
            <div className="band">{info.band}</div>
          </div>
          <div className="hz">
            <span>{info.big}</span>
            <small>{info.small}</small>
          </div>
        </div>
      </div>

      <button type="button" className={`play${playing ? " on" : ""}`} onClick={playing ? stop : start}>
        {playing ? "❚❚ Pausa" : "▶ Avvia"}
      </button>

      {PRESET_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`g-${group.id}`}>
          <p className="label" id={`g-${group.id}`}>{group.title}</p>
          <div className={`grid${group.presets.length === 4 ? " grid4" : ""}`}>
            {group.presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={settings.id === p.id}
                onClick={() => choosePreset(p)}
              >
                <i style={{ background: p.color }} />
                <b>{p.name}</b>
                <span>{presetSubtitle(p)}</span>
              </button>
            ))}
          </div>
          {group.note && <p className="note groupnote">{group.note}</p>}
        </section>
      ))}

      <section className="ctrl" aria-label="Regolazioni">
        <p className="label sub">Tono</p>
        <Slider id="beat" label="Battimento" value={settings.beat} min={0} max={40} step={0.5} unit=" Hz" onChange={update("beat")} />
        <Slider id="car" label="Frequenza" value={settings.car} min={80} max={700} unit=" Hz" onChange={update("car")} />
        <Slider id="tone" label="Volume tono" value={settings.tone} min={0} max={100} unit="%" onChange={update("tone")} />

        <p className="label sub">Natura</p>
        <div className="row">
          <label htmlFor="natype">Suono</label>
          <select id="natype" className="span2" value={settings.natureType} onChange={(e) => update("natureType")(e.target.value)}>
            {Object.entries(NATURE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <Slider id="nature" label="Volume natura" value={settings.nature} min={0} max={100} unit="%" onChange={update("nature")} />

        <p className="label sub">Rumore</p>
        <div className="row">
          <label htmlFor="ntype">Colore</label>
          <select id="ntype" className="span2" value={settings.noiseType} onChange={(e) => update("noiseType")(e.target.value)}>
            {Object.entries(NOISE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <Slider id="noise" label="Volume rumore" value={settings.noise} min={0} max={100} unit="%" onChange={update("noise")} />

        <p className="label sub">Generale</p>
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
        percepisce la differenza. Con battimento a 0 Hz senti un tono puro. Le ricerche sui benefici danno risultati
        contrastanti: usala come sottofondo, non come terapia. Su iPhone l'ascolto a schermo bloccato richiede iOS 17.5
        o successivo. Tieni il volume basso. <b>Non usarla alla guida.</b>
      </p>
    </main>
  );
}
