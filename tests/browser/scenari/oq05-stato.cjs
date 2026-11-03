// OQ-05: lo stato del pulsante segue l'audio reale (avvio rifiutato, interruzioni, tocchi rapidi).
const { openApp, setTimer, text, sel } = require("../lib.cjs");

// sostituisce il comportamento di AudioContext per simulare guasti
const patch = () => {
  const C = window.AudioContext;
  const desc = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "state");
  const origResume = C.prototype.resume;
  window.__forced = null; window.__fail = false; window.__slow = 0;
  Object.defineProperty(BaseAudioContext.prototype, "state", { get() { return window.__forced ?? desc.get.call(this); } });
  C.prototype.resume = function () {
    if (window.__fail) return Promise.reject(new Error("bloccato"));
    const go = () => origResume.call(this).then(() => { window.__forced = null; this.onstatechange?.(); });
    if (window.__slow) return new Promise((res) => setTimeout(() => go().then(res), window.__slow));
    return go();
  };
  window.AudioContext = class extends C {
    constructor(...a) { super(...a); window.__ctx = this; if (window.__startSuspended) window.__forced = "suspended"; }
  };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { init: patch });
  const btn = () => text(p, sel.play);
  const msg = () => p.$eval(".status-msg", (el) => (el.hidden ? "" : el.textContent.trim()));
  const lock = () => p.evaluate(() => navigator.mediaSession?.playbackState);

  await p.evaluate(() => { window.__startSuspended = true; window.__fail = true; });
  await p.click(sel.play); await p.waitForTimeout(300);
  r.check((await btn()).includes("Riprendi") && /browser/.test(await msg()), "avvio rifiutato: 'Riprendi' e messaggio sul browser, mai 'Pausa'");
  r.check((await lock()) === "paused", "avvio rifiutato: la schermata di blocco non indica riproduzione");

  await p.evaluate(() => { window.__fail = false; });
  await p.click(sel.play); await p.waitForTimeout(300);
  r.check((await btn()).includes("Pausa") && (await msg()) === "" && (await lock()) === "playing", "nuovo tocco riuscito: riproduzione e messaggio sparito");

  await setTimer(p, 10); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__fail = true; window.__forced = "interrupted"; window.__ctx.onstatechange(); });
  await p.waitForTimeout(2500);
  r.check((await btn()).includes("Riprendi") && /sistema/.test(await msg()), "interruzione di sistema: 'Riprendi' e messaggio");
  r.check(/restano 9:5\d/.test(await text(p, sel.timerText)), "durante l'interruzione il timer non scorre");

  await p.evaluate(() => { window.__fail = false; });
  await p.click(sel.play); await p.waitForTimeout(400);
  r.check((await btn()).includes("Pausa"), "ripresa dopo l'interruzione");

  await p.click(sel.play); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__forced = "suspended"; window.__slow = 1500; });
  await p.click(sel.play); await p.waitForTimeout(100);
  r.check((await btn()) === "Avvio…", "avvio lento: il pulsante mostra 'Avvio…'");
  await p.click(sel.play); await p.waitForTimeout(2000);
  r.check((await btn()).includes("Riprendi"), "pausa durante l'avvio: l'avvio tardivo viene ignorato");

  await p.evaluate(() => { window.__slow = 300; });
  await p.click(sel.play); await p.click(sel.play); await p.click(sel.play); await p.waitForTimeout(1200);
  const real = await p.evaluate(() => window.__ctx.state);
  r.check((await btn()).includes("Pausa") && real === "running", "tre tocchi rapidi: vale l'ultimo, stato coerente con l'audio reale");

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
