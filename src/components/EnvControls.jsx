// Controlli di personalizzazione di un ambiente naturale (NAT-05), costruiti dal modello:
// ogni ambiente mostra solo le componenti e i parametri che ha davvero.
//
// Ordine: configurazioni rapide → fenomeno principale → componenti opzionali (interruttore,
// parametri visibili solo se accese) → altri sottofondi.

import { useId } from "react";
import Slider from "./Slider.jsx";
import Pills from "./Pills.jsx";
import Switch from "./Switch.jsx";
import { ENVIRONMENTS, scaleWord } from "../environments/model.js";

// nomi visibili dei parametri; il contesto (componente) completa il nome per gli screen reader
const PARAM_LABEL = {
  intensity: "Intensità", level: "Livello", frequency: "Frequenza", distance: "Vicinanza", power: "Potenza",
  strength: "Forza", gusts: "Raffiche", rhythm: "Ritmo", liveliness: "Vivacità", color: "Colore",
};
const COLOR_LABEL = { pink: "Rosa", brown: "Marrone", white: "Bianco" };

function ParamControls({ envId, cid, values, onSet }) {
  const comp = ENVIRONMENTS[envId].components[cid];
  const ctx = comp.label.toLowerCase();
  return Object.entries(comp.params).map(([key, p]) => {
    const id = `env-${cid}-${key}`;
    if (p.type === "choice") {
      return (
        <Pills
          key={key}
          label={PARAM_LABEL[key]}
          context={ctx}
          options={p.options.map((o) => ({ value: o, label: COLOR_LABEL[o] || o }))}
          value={values[key]}
          onChange={(v) => onSet(cid, key, v)}
        />
      );
    }
    // le scale mostrano la parola (es. "Intensa"), i livelli la percentuale
    const display = p.type === "scale" ? scaleWord(p, values[key]) : `${values[key]}%`;
    return (
      <Slider
        key={key}
        id={id}
        label={PARAM_LABEL[key] || key}
        context={ctx}
        value={values[key]}
        min={0}
        max={100}
        display={display}
        onChange={(v) => onSet(cid, key, v)}
      />
    );
  });
}

// stato di preparazione di una componente: feedback locale, non blocca il resto del pannello
function Preparing({ state, what, onRetry }) {
  if (state === "loading") return <p className="field-hint" role="status">Preparazione {what}…</p>;
  if (state === "error") {
    return (
      <p className="field-hint env-error" role="alert">
        Non è stato possibile preparare {what}.{" "}
        <button type="button" className="text-link" onClick={onRetry}>Riprova</button>
      </p>
    );
  }
  return null;
}

const WHAT = { rain: "della pioggia", thunder: "dei tuoni", wind: "del vento" };

function Component({ envId, cid, values, onSet, status, onRetry }) {
  const comp = ENVIRONMENTS[envId].components[cid];
  const head = useId();
  return (
    <section className="sheet-section" aria-labelledby={head}>
      {comp.optional ? (
        <div className="sheet-card">
          <h3 className="sr-only" id={head}>{comp.label}</h3>
          <Switch id={`env-${cid}-on`} label={comp.label} checked={values.on} onChange={(v) => onSet(cid, "on", v)} />
          {/* da spenta i parametri non occupano spazio, ma i valori restano salvati */}
          {values.on && (
            <>
              <ParamControls envId={envId} cid={cid} values={values} onSet={onSet} />
              <Preparing state={status[cid]} what={WHAT[cid] || comp.label.toLowerCase()} onRetry={() => onRetry(cid)} />
            </>
          )}
        </div>
      ) : (
        <>
          <h3 className="label" id={head}>{comp.label}</h3>
          <div className="sheet-card">
            <ParamControls envId={envId} cid={cid} values={values} onSet={onSet} />
            <Preparing state={status[cid]} what={WHAT[cid] || comp.label.toLowerCase()} onRetry={() => onRetry(cid)} />
          </div>
        </>
      )}
    </section>
  );
}

export default function EnvControls({ envId, config, onSet, onQuick, customized, status = {}, onRetry }) {
  const env = ENVIRONMENTS[envId];
  const comps = Object.entries(env.components);
  const main = comps.filter(([, c]) => !c.optional);
  const optional = comps.filter(([, c]) => c.optional && !c.secondary);
  const secondary = comps.filter(([, c]) => c.secondary);
  const quickHead = useId();
  const otherHead = useId();
  const quick = Object.entries(env.quick);

  return (
    <>
      {quick.length > 0 && (
        <section className="sheet-section" aria-labelledby={quickHead}>
          <h3 className="label" id={quickHead}>Configurazioni rapide</h3>
          <div className="quick-configs">
            {quick.map(([qid, q]) => {
              const on = config.base === qid && !customized;
              return (
                <button key={qid} type="button" className="quick-config" aria-pressed={on} onClick={() => onQuick(qid)}>
                  {/* la spunta è solo visiva: lo stato "premuto" lo annuncia aria-pressed */}
                  {on && <span aria-hidden="true">✓ </span>}
                  {q.label}
                </button>
              );
            })}
          </div>
          <p className="field-hint">Scorciatoie: impostano più controlli insieme, poi puoi cambiarli uno per uno.</p>
        </section>
      )}

      {main.map(([cid]) => (
        <Component key={cid} envId={envId} cid={cid} values={config.components[cid]} onSet={onSet} status={status} onRetry={onRetry} />
      ))}
      {optional.map(([cid]) => (
        <Component key={cid} envId={envId} cid={cid} values={config.components[cid]} onSet={onSet} status={status} onRetry={onRetry} />
      ))}

      {secondary.length > 0 && (
        <section className="sheet-section" aria-labelledby={otherHead}>
          <h3 className="label" id={otherHead}>Altri sottofondi</h3>
          {secondary.map(([cid]) => {
            const comp = env.components[cid];
            const v = config.components[cid];
            return (
              <div className="sheet-card" key={cid}>
                <Switch id={`env-${cid}-on`} label={comp.label} checked={v.on} onChange={(on) => onSet(cid, "on", on)} />
                {v.on && <ParamControls envId={envId} cid={cid} values={v} onSet={onSet} />}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
