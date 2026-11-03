// OQ-02: scadenza a pagina nascosta, pausa che resta pausa, blocco schermo riacquisito.
const { openApp, setTimer, text, sel, MIN } = require("../lib.cjs");

const init = () => {
  window.__vis = "visible";
  Object.defineProperty(document, "visibilityState", { get: () => window.__vis });
  Object.defineProperty(document, "hidden", { get: () => window.__vis === "hidden" });
  window.__setVis = (v) => {
    window.__vis = v;
    if (v === "hidden") window.__locks.forEach((l) => l.__sysRelease());
    document.dispatchEvent(new Event("visibilitychange"));
  };
  // blocco schermo finto che conta richieste e rilasci
  window.__locks = []; window.__lockReq = 0;
  Object.defineProperty(navigator, "wakeLock", { value: { request: async () => {
    window.__lockReq++;
    const l = new EventTarget();
    l.release = async () => { window.__locks = window.__locks.filter((x) => x !== l); };
    l.__sysRelease = () => { l.release(); l.dispatchEvent(new Event("release")); };
    window.__locks.push(l);
    return l;
  } } });
  const desc = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state");
  window.__forced = null;
  Object.defineProperty(BaseAudioContext.prototype, "state", { get() { return window.__forced ?? desc.get.call(this); } });
  const C = window.AudioContext;
  window.AudioContext = class extends C { constructor(...a) { super(...a); window.__ctx = this; } };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { clock: true, init });
  const btn = () => text(p, sel.play);
  const locks = () => p.evaluate(() => window.__locks.length);
  const ctx = () => p.evaluate(() => window.__ctx?.state);
  const vis = (v) => p.evaluate((x) => window.__setVis(x), v);

  await setTimer(p, 10); await p.click(sel.play); await p.clock.runFor(1000);
  r.check((await locks()) === 1, "in ascolto: schermo tenuto acceso");
  await vis("hidden");
  await p.clock.fastForward(15 * MIN);
  await vis("visible"); await p.clock.runFor(2000);
  r.check((await btn()).includes("Avvia"), "timer scaduto a pagina nascosta: al rientro la sessione è chiusa");
  await p.clock.runFor(4000);
  r.check((await btn()).includes("Avvia") && (await ctx()) === "suspended", "nessuna ripartenza automatica dopo la scadenza");

  await p.click(sel.play); await p.clock.runFor(1000); await p.click(sel.play); await p.clock.runFor(500);
  await p.evaluate(() => { window.__setVis("hidden"); window.__setVis("visible"); window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("pageshow")); });
  await p.clock.runFor(7000);
  r.check((await btn()).includes("Riprendi") && (await locks()) === 0, "la pausa dell'utente non viene annullata dal recupero automatico");

  await p.click(sel.play); await p.clock.runFor(1000);
  await vis("hidden"); await p.clock.runFor(500);
  r.check((await locks()) === 0, "pagina nascosta: il sistema rilascia il blocco schermo");
  await vis("visible"); await p.clock.runFor(1000);
  r.check((await locks()) === 1, "rientro con audio mai fermato: blocco schermo riacquisito");

  await setTimer(p, 10); await p.clock.runFor(500);
  await vis("hidden");
  await p.clock.fastForward(12 * MIN);
  await p.evaluate(() => { window.__forced = "interrupted"; window.__ctx.onstatechange(); });
  await p.clock.runFor(500);
  await p.evaluate(() => { window.__forced = null; window.__setVis("visible"); }); await p.clock.runFor(2000);
  r.check((await btn()).includes("Avvia") && !/0:00/.test(await text(p, sel.timerText)), "interruzione dopo la scadenza: sessione chiusa, non 'in pausa · 0:00'");

  await p.click(sel.play); await p.clock.runFor(1000); await p.click(sel.play); await p.clock.runFor(2000);
  r.check((await locks()) === 0 && (await ctx()) === "suspended", "in pausa: blocco schermo rilasciato e audio sospeso per la batteria");

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
