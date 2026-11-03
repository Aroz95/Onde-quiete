// OQ-01: il timer conserva il residuo in pausa e non viene toccato dai cambi di preset.
const { openApp, setTimer, text, sel, MIN } = require("../lib.cjs");

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { clock: true });
  const t = () => text(p, sel.timerText);
  const btn = () => text(p, sel.play);

  await setTimer(p, 25);
  r.check((await t()) === "Timer 25 min" && (await btn()).includes("Avvia"), "durata scelta ad audio fermo: nessuna sessione in pausa");

  await p.click(sel.play); await p.clock.runFor(1000);
  await p.clock.fastForward(10 * MIN); await p.clock.runFor(600);
  await p.click(sel.play);
  r.check(/restano 14:5\d/.test(await t()), `pausa dopo 10 min di ascolto: ${await t()}`);

  await p.clock.fastForward(60 * MIN); await p.clock.runFor(600);
  r.check(/restano 14:5\d/.test(await t()), "un'ora di pausa non consuma il residuo");

  await p.click(sel.play); await p.clock.runFor(1000);
  r.check(/Si spegne tra 14:5\d/.test(await t()), "la ripresa riparte dal residuo");

  await p.click(sel.tab("nature")); await p.click(sel.preset("Pioggia")); await p.clock.runFor(1000);
  r.check(/Si spegne tra 14:5\d/.test(await t()), "cambio di preset durante l'ascolto: timer invariato");

  await p.click(".adjust"); await p.fill("#env-rain-level", "50"); await p.click(".text-btn.strong"); await p.clock.runFor(1000);
  r.check(/Si spegne tra 14:5\d/.test(await t()), "regolazione di un livello: timer invariato");

  await p.clock.fastForward(15 * MIN); await p.clock.runFor(1000);
  r.check((await btn()).includes("Avvia") && (await t()) === "Timer 25 min", "alla scadenza l'audio si spegne e lo stato torna inattivo");

  await p.click(sel.play); await p.clock.runFor(1000);
  r.check(/Si spegne tra 24:5\d/.test(await t()), "nuovo avvio dopo la scadenza: durata intera");

  await setTimer(p, 0); await p.clock.runFor(1000);
  r.check((await t()) === "Timer disattivato" && (await btn()).includes("Pausa"), "'Disattivato' toglie il timer senza fermare l'audio");

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
