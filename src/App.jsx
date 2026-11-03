import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRESETS, PRESET_GROUPS, kindOf } from "./presets.js";
import { describeMix, shortMix, needsHeadphones } from "./mixDescription.js";
import { useAudioEngine } from "./audio/useAudioEngine.js";
import { playButton, playbackMessage } from "./audio/playbackState.js";
import { updateMediaSession } from "./audio/background.js";
import Scope from "./components/Scope.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import TabBar from "./components/TabBar.jsx";
import AdjustSheet from "./components/AdjustSheet.jsx";
import QuickControls from "./components/QuickControls.jsx";
import Icon, { presetIcon } from "./components/Icons.jsx";
import { ENVIRONMENTS, defaultConfig, applyQuick, setParam, isCustomized, validateState } from "./environments/model.js";
import { migrateLegacy, migratePresetId } from "./environments/migration.js";
import { summarizeEnv, describeEnv } from "./environments/describe.js";
import {
  createTimer, resumeTimer, pauseTimer, setTimerDuration, finishTimer,
  timerRemaining, timerOver, formatRemaining,
} from "./timer.js";

const TABS = [
  { id: "needs", label: "Esigenze" },
  { id: "nature", label: "Natura" },
  { id: "solfeggio", label: "Solfeggio" },
];

// chiavi usate per ricordare le scelte su questo dispositivo
const STORE = {
  tab: "onde-quiete-tab", tweaks: "onde-quiete-tweaks", preset: "onde-quiete-preset", volume: "onde-quiete-volume",
  envs: "onde-quiete-ambienti", // stato versionato degli ambienti naturali
};
// vecchi preset Natura che hanno già il nuovo motore a componenti
const MIGRATED_LEGACY = ["rain", "storm"];
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

const merge = (preset, tweak) => ({ ...preset, ...(tweak || {}) });

// Primo caricamento: preferenze salvate e, se serve, migrazione dei vecchi preset Natura.
// Un dato mancante o rovinato non impedisce l'apertura: si torna ai valori predefiniti.
function loadInitial() {
  const tweaks = load(STORE.tweaks, {}) || {};
  const savedPreset = load(STORE.preset, PRESETS[0].id);
  const rawEnvs = load(STORE.envs, null);
  let envState, rest = tweaks;
  if (rawEnvs) {
    envState = validateState(rawEnvs);
    // dati della versione precedente rimasti accanto a quelli nuovi: si scartano
    rest = { ...tweaks };
    MIGRATED_LEGACY.forEach((id) => delete rest[id]);
  } else {
    const m = migrateLegacy(tweaks && typeof tweaks === "object" ? tweaks : {}, savedPreset, MIGRATED_LEGACY);
    envState = m.state;
    rest = m.tweaks;
  }
  const id = migratePresetId(savedPreset);
  return { presetId: PRESETS.some((p) => p.id === id) ? id : PRESETS[0].id, tweaks: rest, envState };
}

export default function App() {
  const [initial] = useState(loadInitial);
  const [presetId, setPresetId] = useState(initial.presetId);
  // modifiche dell'utente, separate per ogni preset: { relax: { beat: 9 } }
  const [tweaks, setTweaks] = useState(initial.tweaks);
  // ambienti naturali: una configurazione per ambiente, indipendente da Esigenze e Solfeggio
  const [envState, setEnvState] = useState(initial.envState);
  const [volume, setVolume] = useState(() => load(STORE.volume, 70));
  const [timer, setTimer] = useState(() => createTimer(0));
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState(() => {
    const t = load(STORE.tab, "needs");
    return TABS.some((x) => x.id === t) ? t : "needs";
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const preset = PRESETS.find((p) => p.id === presetId);
  const kind = kindOf(presetId);
  const envId = preset.env || null;
  const envConfig = envId ? envState.envs[envId] : null;
  const settings = useMemo(() => {
    const base = merge(preset, tweaks[presetId]);
    if (!envConfig) return base;
    // per un ambiente il rumore colorato viene da "Altri sottofondi"
    const n = envConfig.components.noise;
    return { ...base, noise: n.on ? n.level : 0, noiseType: n.color };
  }, [preset, tweaks, presetId, envConfig]);
  const modified = envConfig ? isCustomized(envId, envConfig) : Object.keys(tweaks[presetId] || {}).length > 0;
  const engineEnv = useMemo(() => (envConfig ? { id: envId, config: envConfig } : null), [envId, envConfig]);
  const currentTab = PRESET_GROUPS.find((g) => g.presets.some((p) => p.id === presetId))?.id;

  useEffect(() => save(STORE.tweaks, tweaks), [tweaks]);
  useEffect(() => save(STORE.preset, presetId), [presetId]);
  useEffect(() => save(STORE.volume, volume), [volume]);
  useEffect(() => save(STORE.envs, envState), [envState]);

  // copia sempre aggiornata del timer, per i controlli fatti da eventi esterni a React
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const finishRef = useRef(null);

  // Prima di ogni ripresa automatica (ritorno in primo piano, fine di un'interruzione):
  // una sessione scaduta mentre la pagina era sospesa si chiude e non riparte.
  const beforeAutoResume = () => {
    if (timerOver(timerRef.current, Date.now())) {
      finishRef.current?.();
      return false;
    }
    return true;
  };
  const engine = useAudioEngine({ ...settings, volume, env: engineEnv }, { beforeAutoResume });
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

  const resetPreset = () => {
    if (envId) { updateEnv(() => defaultConfig(envId)); return; }
    setTweaks((all) => {
      const next = { ...all };
      delete next[presetId];
      return next;
    });
  };

  // modifiche dell'ambiente: dal vivo durante l'ascolto, in pausa aggiornano solo la configurazione
  const updateEnv = (fn) => setEnvState((st) => ({ ...st, envs: { ...st.envs, [envId]: fn(st.envs[envId]) } }));
  const setEnvValue = (cid, key, value) => updateEnv((c) => setParam(envId, c, cid, key, value));
  const chooseQuick = (qid) => updateEnv((c) => applyQuick(envId, c, qid));

  // Avvia o riprende. Il timer parte solo quando l'audio è confermato (vedi effetto più sotto).
  const start = () => engine.play();
  // Pausa dell'utente: il residuo del timer resta congelato.
  const pause = () => engine.pause();
  // Fine per timer: l'audio si spegne e la sessione si chiude.
  const finish = () => {
    setTimer((tm) => finishTimer(tm));
    engine.finish();
  };
  finishRef.current = finish;

  // il timer scorre solo mentre l'audio suona davvero: si ferma in pausa,
  // in avvio non riuscito e durante le interruzioni di sistema
  useEffect(() => {
    const t = Date.now();
    // un'interruzione arrivata dopo la scadenza chiude la sessione invece di congelarla
    if (!playing && timerOver(timerRef.current, t)) {
      finish();
      return;
    }
    setTimer((tm) => (playing ? resumeTimer(tm, t) : pauseTimer(tm, t)));
    setNow(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // la scadenza viene scritta anche nel clock audio: la dissolvenza finale avviene
  // in orario pure con lo schermo bloccato, quando il JavaScript è rallentato
  useEffect(() => {
    engine.setSessionEnd(timer.endAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.endAt]);

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
      if (timerOver(timer, t)) finish();
      else setNow(t);
    };
    tick();
    const id = setInterval(tick, 500);
    // al ritorno in primo piano si riconcilia subito, senza aspettare l'intervallo
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  const remainingMs = timerRemaining(timer, now);
  const remaining = formatRemaining(remainingMs);
  const timerPaused = remainingMs != null && timer.endAt == null;
  const button = playButton(playback, remainingMs != null);
  const message = playbackMessage(playback);

  // per un ambiente i testi vengono dalla sua configurazione effettiva
  const description = envConfig ? describeEnv(envId, envConfig) : describeMix(settings);
  const short = envConfig ? summarizeEnv(envId, envConfig) : shortMix(settings);
  const headphones = !envConfig && needsHeadphones(settings);

  // stato scritto (non solo colorato) del preset selezionato
  const stateWord = {
    playing: "In ascolto",
    starting: "Avvio…",
    paused: "In pausa",
    interrupted: "Interrotto",
  }[playback.status] || "Selezionato";

  // titolo e pulsanti play/pausa nella schermata di blocco
  useEffect(() => {
    updateMediaSession({
      title: settings.name,
      subtitle: description,
      playing,
      onPlay: start,
      onPause: pause,
    });
  });

  return (
    <main className="wrap">
      <UpdateBanner />
      <header className="top">
        <h1>Onde Quiete</h1>
      </header>

      <section className="now" aria-label="In ascolto">
        <button type="button" className="scope" onClick={() => setSheetOpen(true)} aria-label={`Regola ${settings.name}`}>
          {/* visualizzazione decorativa: non misura il suono né l'attività cerebrale */}
          <Scope {...settings} playing={playing} />
          <span className="readout">
            <span className="now-state">{stateWord}</span>
            <span className="mode">
              {settings.name}
              {modified && <span className="badge">{envConfig ? "personalizzato" : "su misura"}</span>}
            </span>
            <span className="now-desc">{short}</span>
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
            <Icon name="sliders" />
            <span>Regola</span>
          </button>
        </div>

        <QuickControls
          volume={volume}
          onVolume={setVolume}
          timerMin={timer.durationMin}
          onTimer={changeTimer}
          remaining={remaining}
          running={playing}
        />

        {/* sempre presente, così gli screen reader annunciano il messaggio quando compare */}
        <p className="status-msg" role="status" aria-live="polite" hidden={!message}>
          {message}
        </p>

        {/* cuffie: indicazione breve sempre visibile, spiegazione a richiesta */}
        <details className="hint-line">
          <summary>
            <Icon name="headphones" />
            <span>{headphones ? "Usa le cuffie" : "Cuffie consigliate"}</span>
          </summary>
          <p>
            {headphones
              ? "L'effetto binaurale nasce da un suono leggermente diverso in ciascun orecchio: dagli altoparlanti non si sente."
              : "Questo suono funziona anche dagli altoparlanti; in cuffia si apprezza meglio lo spazio stereo."}
          </p>
        </details>
      </section>

      {PRESET_GROUPS.map((group) => (
        <section
          key={group.id}
          id={`panel-${group.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${group.id}`}
          hidden={tab !== group.id}
          className="panel"
        >
          <div className="panel-head">
            <h2 className="label">{group.title}</h2>
            <p className="panel-hint">
              {!active ? "Tocca un suono per ascoltarlo" : timer.durationMin ? "Cambia suono senza interrompere il timer" : "Tocca un suono per cambiarlo"}
            </p>
          </div>
          <div className="grid">
            {group.presets.map((p) => {
              const shown = merge(p, tweaks[p.id]);
              const selected = presetId === p.id;
              const kindP = kindOf(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  aria-pressed={selected}
                  onClick={() => choosePreset(p)}
                  style={{ "--tint": p.color }}
                >
                  <span className="chip-top">
                    <Icon name={presetIcon(kindP, p)} className="chip-icon" />
                    {selected && (
                      <span className="chip-state">
                        <Icon name="check" className="chip-check" />
                        {stateWord}
                      </span>
                    )}
                  </span>
                  <b>{p.name}</b>
                  {p.env ? (
                    <>
                      <span className="chip-desc">{summarizeEnv(p.env, envState.envs[p.env])}</span>
                      {isCustomized(p.env, envState.envs[p.env]) && <span className="chip-tag">personalizzato</span>}
                    </>
                  ) : (
                    <>
                      <span className="chip-desc">{shortMix(shown)}</span>
                      {tweaks[p.id] && <span className="chip-tag">su misura</span>}
                    </>
                  )}
                  {!active && <span className="sr-only">, tocca per ascoltare</span>}
                </button>
              );
            })}
          </div>
          {group.note && <p className="note">{group.note}</p>}
        </section>
      ))}

      <TabBar
        tabs={TABS.map((t) => ({ ...t, hasCurrent: t.id === currentTab }))}
        active={tab}
        onChange={selectTab}
        playing={playing}
      />

      <footer className="foot note">
        Le ricerche sui battimenti binaurali danno risultati contrastanti: usala come sottofondo, non come terapia.
        Tieni il volume basso. <b>Non usarla alla guida.</b>
      </footer>

      <AdjustSheet
        open={sheetOpen}
        onClose={closeSheet}
        kind={kind}
        settings={settings}
        onSet={setValue}
        modified={modified}
        onReset={resetPreset}
        env={envConfig ? {
          id: envId,
          config: envConfig,
          title: `Personalizza ${ENVIRONMENTS[envId].name}`,
          summary: description,
          onSet: setEnvValue,
          onQuick: chooseQuick,
          status: engine.envStatus,
          onRetry: engine.retryEnv,
        } : null}
      />
    </main>
  );
}
