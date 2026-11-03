// OQ-04: il pannello Regola si comporta come una finestra modale accessibile.
const { openApp } = require("../lib.cjs");

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser);
  const where = () => p.evaluate(() => ({ inSheet: !!document.activeElement.closest(".sheet"), cls: document.activeElement.className }));

  await p.focus(".adjust"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  r.check((await where()).cls === "sheet", "apertura: il focus va sul pannello, che ha il titolo");

  let inside = true;
  for (let i = 0; i < 40; i++) { await p.keyboard.press("Tab"); inside &&= (await where()).inSheet; }
  r.check(inside, "40 pressioni di Tab: il focus non esce dal pannello");
  inside = true;
  for (let i = 0; i < 40; i++) { await p.keyboard.press("Shift+Tab"); inside &&= (await where()).inSheet; }
  r.check(inside, "40 pressioni di Maiusc+Tab: il focus non esce dal pannello");

  const bg = await p.evaluate(() => ({ inert: document.getElementById("root").inert, hidden: document.getElementById("root").getAttribute("aria-hidden") }));
  r.check(bg.inert && bg.hidden === "true", "app sotto il pannello inerte e nascosta agli screen reader");
  const aria = await p.locator("body").ariaSnapshot();
  r.check(!aria.includes("Concentrazione") && /dialog "Regola /.test(aria), "albero di accessibilità: solo il dialogo 'Regola …'");
  r.check(/slider "Livello, rumore di fondo"/.test(aria), "cursori con nome distinto (es. 'Livello, rumore di fondo')");
  const vt = await p.$$eval(".sheet input[type=range]", (els) => els.map((e) => e.getAttribute("aria-valuetext")));
  r.check(vt.every((v) => /\d+( Hz|%)$/.test(v)), `valori letti con l'unità: ${vt.join(", ")}`);

  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  r.check((await where()).cls === "adjust", "Esc: il focus torna su Regola");
  const after = await p.evaluate(() => ({ inert: document.getElementById("root").inert, open: document.body.classList.contains("sheet-open") }));
  r.check(!after.inert && !after.open, "chiusura: app di nuovo attiva e scorrimento ripristinato");

  await p.focus(".scope"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  await p.click(".text-btn.strong"); await p.waitForTimeout(400);
  r.check((await where()).cls === "scope", "Fine: il focus torna sul riquadro dell'onda");
  await p.focus(".scope"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  await p.mouse.click(195, 40); await p.waitForTimeout(400);
  r.check((await where()).cls === "scope", "tocco sullo sfondo: il focus torna sul riquadro dell'onda");

  await p.setViewportSize({ width: 195, height: 422 }); await p.waitForTimeout(300); // come zoom 200% su telefono
  await p.click(".adjust"); await p.waitForTimeout(500);
  const fine = await p.$eval(".text-btn.strong", (el) => { const b = el.getBoundingClientRect(); return b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; });
  const hs = await p.evaluate(() => { const b = document.querySelector(".sheet-body"); return b.scrollWidth > b.clientWidth + 1; });
  r.check(fine && !hs, "zoom 200%: 'Fine' visibile e nessuno scorrimento orizzontale nel pannello");

  r.check(errors.length === 0, "nessun errore nella pagina");
  await p.close();
};
