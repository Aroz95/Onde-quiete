// OQ-10, NAT-02: la prima scelta della Pioggia non blocca l'interfaccia mentre le sorgenti si preparano.
const { openApp, text, sel } = require("../lib.cjs");

const init = () => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
  // la pioggia è pronta quando partono il fondo e i tre strati di gocce (loop da 8, 10 e 12 s)
  window.__rainLoops = 0;
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    if (this.loop && this.buffer && [8, 10, 12].some((d) => Math.abs(this.buffer.duration - d) < 0.01)) { window.__rainLoops++; window.__rainAt = performance.now(); }
    return start.apply(this, a);
  };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { init });
  await p.click(sel.play); await p.waitForTimeout(1500);
  await p.click(sel.tab("nature"));
  await p.evaluate(() => { window.__long = []; window.__rainLoops = 0; });
  const t0 = await p.evaluate(() => performance.now());
  await p.click(sel.preset("Pioggia"));
  await p.waitForFunction(() => window.__rainLoops >= 4, null, { timeout: 30000 });
  const first = await p.evaluate((t) => ({ ready: Math.round(window.__rainAt - t), longest: Math.max(0, ...window.__long) }), t0);
  r.info(`prima scelta della Pioggia: pronta dopo ${first.ready} ms, blocco più lungo ${first.longest} ms`);
  r.check(first.longest < 100, "prima scelta della Pioggia: nessun blocco dell'interfaccia oltre 100 ms");
  r.check((await text(p, sel.play)).includes("Pausa"), "durante la preparazione l'audio continua");

  // altro suono e ritorno: le sorgenti della Pioggia sono già pronte
  await p.click(sel.preset("Onde del mare")); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__rainLoops = 0; window.__long = []; });
  const t1 = await p.evaluate(() => performance.now());
  await p.click(sel.preset("Pioggia"));
  await p.waitForFunction(() => window.__rainLoops >= 4, null, { timeout: 30000 });
  const again = await p.evaluate((t) => Math.round(window.__rainAt - t), t1);
  r.check(again < 300, `ritorno alla Pioggia: sorgenti riusate, pronta in ${again} ms`);

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
