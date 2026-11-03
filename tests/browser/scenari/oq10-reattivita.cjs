// OQ-10: la prima scelta di un suono della natura non blocca l'interfaccia.
const { openApp, text, sel } = require("../lib.cjs");

const init = () => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    if (this.buffer && this.buffer.duration > 40) window.__stormAt = performance.now(); // il temporale dura 45 s
    return start.apply(this, a);
  };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { init });
  await p.click(sel.play); await p.waitForTimeout(1500);
  await p.click(sel.tab("nature"));
  await p.evaluate(() => { window.__long = []; window.__stormAt = null; });
  const t0 = await p.evaluate(() => performance.now());
  await p.click(sel.preset("Temporale"));
  await p.waitForFunction(() => window.__stormAt, null, { timeout: 30000 });
  const first = await p.evaluate((t) => ({ ready: Math.round(window.__stormAt - t), longest: Math.max(0, ...window.__long) }), t0);
  r.info(`prima scelta del temporale: pronto dopo ${first.ready} ms, blocco più lungo ${first.longest} ms`);
  r.check(first.longest < 100, "prima scelta del temporale: nessun blocco dell'interfaccia oltre 100 ms");
  r.check((await text(p, sel.play)).includes("Pausa"), "durante il caricamento l'audio continua");

  await p.click(sel.preset("Pioggia")); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__stormAt = null; });
  const t1 = await p.evaluate(() => performance.now());
  await p.click(sel.preset("Temporale"));
  await p.waitForFunction(() => window.__stormAt, null, { timeout: 30000 });
  const again = await p.evaluate((t) => Math.round(window.__stormAt - t), t1);
  r.check(again < 300, `seconda scelta: dalla memoria in ${again} ms`);

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
