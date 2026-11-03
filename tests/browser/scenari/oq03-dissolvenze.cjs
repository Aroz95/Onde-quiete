// OQ-03: cambi rapidi di natura e rumore senza errori né sorgenti accumulate.
const { openApp, text, sel } = require("../lib.cjs");

// conta le sorgenti in loop attive (avviate e non ancora finite)
const init = () => {
  window.__live = 0;
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    if (this.loop) { window.__live++; this.addEventListener("ended", () => window.__live--); }
    return start.apply(this, a);
  };
};

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { init });
  await p.click(sel.play); await p.waitForTimeout(1500); // natura e rumore del primo preset pronti
  await p.click(".adjust"); await p.waitForTimeout(400);
  for (const c of ["Marrone", "Bianco", "Rosa", "Marrone", "Bianco"]) { await p.click(`.pill:has-text('${c}')`); await p.waitForTimeout(80); }
  for (const c of ["Onde", "Vento", "Camino", "Pioggia", "Onde"]) { await p.click(`.pill:has-text('${c}')`); await p.waitForTimeout(80); }
  await p.click(".text-btn.strong");
  await p.waitForTimeout(3000); // fine di tutte le dissolvenze (0,8 s) e dei caricamenti
  const live = await p.evaluate(() => window.__live);
  r.check(live === 2, `dopo 10 cambi rapidi restano solo 2 sorgenti in loop (rumore e natura): ${live}`);

  await p.click(sel.play); await p.waitForTimeout(1500);
  r.check((await text(p, sel.play)).includes("Riprendi"), "pausa subito dopo una serie di cambi: stato corretto");
  r.check(errors.length === 0, "nessun errore nella pagina (nessuna automazione sovrapposta)");
  await p.close();
};
