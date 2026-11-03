import { useCallback, useEffect, useMemo, useState } from "react";
import { PRESETS, PRESET_GROUPS, NOISE_LABELS, NATURE_LABELS, bandOf, presetSubtitle, kindOf } from "./presets.js";
import { useAudioEngine } from "./audio/useAudioEngine.js";
import { playButton, playbackMessage } from "./audio/playbackState.js";
import { updateMediaSession } from "./audio/background.js";
import Scope from "./components/Scope.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import TabBar from "./components/TabBar.jsx";
import AdjustSheet from "./components/AdjustSheet.jsx";
import {
  createTimer, resumeTimer, pauseTimer, setTimerDuration, finishTimer,
  timerRemaining, timerExpired, formatRemaining,
} from "./timer.js";

const TABS = [
  { id: "needs", label: "Esigenze" },
  { id: "nature", label: "Natura" },
  { id: "solfeggio", label: "Solfeggio" },
];

// chiavi usate per ricordare le scelte su questo dispositivo
const STORE = { tab: "onde-quiete-tab", tweaks: "onde-quiete-tweaks", preset: "onde-quiete-preset", volume: "onde-quiete-volume" };
const TWEAKABLE = ["beat", "car", "tone", "noise", "noiseType", "nature", "natureType"];

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* memoria non disponibile */ }
}

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

const merge = (preset, tweak) => ({ ...preset, ...(tweak || {}) });

export default function App() {
  const [presetId, setPresetId] = useState(() => {
    const id = load(STORE.preset, PRESETS[0].id);
    return PRESETS.some((p) => p.id === id) ? id : PRESETS[0].id;
  });
  // modifiche dell'utente, separate per ogni preset: { relax: { beat: 9 }, rain: { nature: 60 } }
  const [tweaks, setTweaks] = useState(() => load(STORE.tweaks, {}));
  const [volume, setVolume] = useState(() => load(STORE.volume, 70));
  const [timer, setTimer] = useState(() => createTimer(0));
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState(() => {
    const t = load(STORE.tab, "needs");
    return TABS.some((x) => x.id === t) ? t : "needs";
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const preset = PRESETS.find((p) => p.id === presetId);
  const settings = useMemo(() => merge(preset, tweaks[presetId]), [preset, tweaks, presetId]);
  const kind = kindOf(presetId);
  const modified = Object.keys(tweaks[presetId] || {}).length > 0;
  const currentTab = PRESET_GROUPS.find((g) => g.presets.some((p) => p.id === presetId))?.id;

  useEffect(() => save(STORE.tweaks, tweaks), [tweaks]);
  useEffect(() => save(STORE.preset, presetId), [presetId]);
  useEffect(() => save(STORE.volume, volume), [volume]);

  const engine = useAudioEngine({ ...settings, volume });
  const { playback } = engine;
  // "playing" significa che l'audio suona davvero, non solo che è stato richiesto
  const playing = playback.status === "playing";
  const active = playback.status === "playing" || playback.status === "starting";

  const selectTab = (id) => {
    setTab(id);
    save(STORE.tab, id);
  };

  const setValue = (key, value) => {
    if (!TWEAKABLE.includes(key)) return;
    setTweaks((all) => {
      const mine = { ...(all[presetId] || {}) };
      if (preset[key] === value) delete mine[key]; // tornato al valore originale
      else mine[key] = value;
      const next = { ...all };
      if (Object.keys(mine).length) next[presetId] = mine;
      else delete next[presetId];
      return next;
    });
  };

  const resetPreset = () =>
    setTweaks((all) => {
      const next = { ...all };
      delete next[presetId];
      return next;
    });

  // Avvia o riprende. Il timer parte solo quando l'audio è confermato (vedi effetto più sotto).
  const start = () => engine.play();
  // Pausa dell'utente: il residuo del timer resta congelato.
  const pause = () => engine.pause();
  // Fine per timer: l'audio si spegne e la sessione si chiude.
  const finish = () => {
    setTimer((tm) => finishTimer(tm));
    engine.finish();
  };

  // il timer scorre solo mentre l'audio suona davvero: si ferma in pausa,
  // in avvio non riuscito e durante le interruzioni di sistema
  useEffect(() => {
    const t = Date.now();
    setTimer((tm) => (playing ? resumeTimer(tm, t) : pauseTimer(tm, t)));
    setNow(t);
  }, [playing]);

  // Cambiare preset non tocca il timer; se l'audio è fermo, il tocco avvia l'ascolto.
  const choosePreset = (p) => {
    setPresetId(p.id);
    if (!active) start();
  };

  // Una nuova durata sostituisce il residuo; "No" lo disattiva senza fermare l'audio.
  const changeTimer = (m) => {
    const t = Date.now();
    setTimer((tm) => setTimerDuration(tm, m, t, playing));
    setNow(t);
  };

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // conto alla rovescia: aggiorna il display e chiude la sessione alla scadenza
  useEffect(() => {
    if (timer.endAt == null) return;
    const tick = () => {
      const t = Date.now();
      if (timerExpired(timer, t)) finish();
      else setNow(t);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  const remainingMs = timerRemaining(timer, now);
  const remaining = formatRemaining(remainingMs);
  const timerPaused = remainingMs != null && timer.endAt == null;
  const button = playButton(playback, remainingMs != null);
  const message = playbackMessage(playback);

  const info = describe(settings);

  // titolo e pulsanti play/pausa nella schermata di blocco
  useEffect(() => {
    updateMediaSession({
      title: settings.name,
      subtitle: info.big !== "—" ? `${info.band} · ${info.big}` : info.small,
      playing,
      onPlay: start,
      onPause: pause,
    });
  });

  return (
    <main className="wrap">
      <UpdateBanner />
      <header>
        <h1>Onde Quiete</h1>
        <span className="hint">🎧 usa le cuffie</span>
      </header>

      <button type="button" className="scope" onClick={() => setSheetOpen(true)} aria-label={`Regola ${settings.name}`}>
        <Scope {...settings} playing={playing} />
        <span className="readout">
          <span>
            <span className="mode">
              {settings.name}
              {modified && <span className="badge">modificato</span>}
            </span>
            <span className="band">{info.band}</span>
          </span>
          <span className="hz">
            <span>{info.big}</span>
            <small>{remaining ? (timerPaused ? `in pausa · restano ${remaining}` : `si spegne tra ${remaining}`) : info.small}</small>
          </span>
        </span>
      </button>

      <div className="controls">
        <button
          type="button"
          className={`play${active ? " on" : ""}`}
          onClick={button.action === "pause" ? pause : start}
          disabled={!button.action}
          aria-busy={playback.status === "starting"}
        >
          {button.label}
        </button>
        <button type="button" className="adjust" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          <span>Regola</span>
        </button>
      </div>

      {/* sempre presente, così gli screen reader annunciano il messaggio quando compare */}
      <p className="status-msg" role="status" aria-live="polite" hidden={!message}>
        {message}
      </p>

      {PRESET_GROUPS.map((group) => (
        <section
          key={group.id}
          id={`panel-${group.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${group.id}`}
          hidden={tab !== group.id}
          className="panel"
        >
          <h2 className="label">{group.title}</h2>
          <div className={`grid${group.presets.length === 4 ? " grid4" : ""}`}>
            {group.presets.map((p) => {
              const shown = merge(p, tweaks[p.id]);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  aria-pressed={presetId === p.id}
                  onClick={() => choosePreset(p)}
                >
                  <i style={{ background: p.color }} />
                  <b>{p.name}</b>
                  <span>
                    {presetSubtitle(shown)}
                    {tweaks[p.id] && " · su misura"}
                  </span>
                </button>
              );
            })}
          </div>
          {group.note && <p className="note groupnote">{group.note}</p>}
        </section>
      ))}

      <TabBar
        tabs={TABS.map((t) => ({ ...t, hasCurrent: t.id === currentTab }))}
        active={tab}
        onChange={selectTab}
        playing={playing}
      />

      <AdjustSheet
        open={sheetOpen}
        onClose={closeSheet}
        kind={kind}
        settings={settings}
        onSet={setValue}
        modified={modified}
        onReset={resetPreset}
        volume={volume}
        onVolume={setVolume}
        timerMin={timer.durationMin}
        onTimer={changeTimer}
        remaining={remaining}
        timerPaused={timerPaused}
      />
    </main>
  );
}
