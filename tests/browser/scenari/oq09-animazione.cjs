// OQ-09: l'onda si anima solo quando serve e segue le dimensioni del canvas.
const { openApp, text, sel } = require("../lib.cjs");

const init = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
  window.__vis = "visible";
  Object.defineProperty(document, "visibilityState", { get: () => window.__vis });
  window.__setVis = (v) => { window.__vis = v; document.dispatchEvent(new Event("visibilitychange")); };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { init });
  const frames = async (ms) => { const a = await p.evaluate(() => window.__raf); await p.waitForTimeout(ms); return (await p.evaluate(() => window.__raf)) - a; };
  const pixels = () => p.evaluate(() => document.querySelector(".scope canvas").toDataURL());

  r.check((await frames(1000)) === 0, "all'apertura, da fermo: nessun ciclo di disegno");
  await p.click(sel.play); await p.waitForTimeout(300);
  r.check((await frames(1000)) > 30, "in ascolto: animazione attiva");
  await p.click(sel.play); await p.waitForTimeout(300);
  r.check((await frames(1500)) === 0, "in pausa: nessun ciclo di disegno");

  await p.click(sel.play); await p.waitForTimeout(300);
  await p.emulateMedia({ reducedMotion: "reduce" }); await p.waitForTimeout(300);
  const a = await pixels(); const f = await frames(1500); const b = await pixels();
  r.check(f === 0 && a === b, "movimento ridotto attivato in ascolto: immagine ferma, senza tremolio");
  r.check((await text(p, sel.play)).includes("Pausa"), "l'audio continua con l'onda ferma");
  await p.emulateMedia({ reducedMotion: "no-preference" }); await p.waitForTimeout(300);
  r.check((await frames(800)) > 20, "preferenza tolta durante la sessione: l'animazione riprende");

  await p.evaluate(() => window.__setVis("hidden")); await p.waitForTimeout(200);
  r.check((await frames(1500)) === 0, "pagina nascosta: nessun fotogramma");
  await p.evaluate(() => window.__setVis("visible")); await p.waitForTimeout(200);
  r.check((await frames(800)) > 20, "ritorno in primo piano: animazione ripristinata");

  const size = () => p.evaluate(() => { const c = document.querySelector(".scope canvas"); return [c.width, c.height, c.clientWidth, c.clientHeight, devicePixelRatio]; });
  await p.click(sel.play); await p.waitForTimeout(300);
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  let s = await size();
  r.check(s[0] === Math.round(s[2] * s[4]) && s[1] === Math.round(s[3] * s[4]), `rotazione in orizzontale, in pausa: canvas ${s[0]}×${s[1]}`);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 3, mobile: true }); await p.waitForTimeout(500);
  s = await size();
  r.check(s[4] === 3 && s[0] === Math.round(s[2] * 3) && s[1] === Math.round(s[3] * 3), `densità dei pixel 3×: canvas ${s[0]}×${s[1]}, nitido e non deformato`);

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
