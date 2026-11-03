// OQ-06, 07, 08, 11: proporzioni, sovrapposizioni, barra inferiore, testi e controlli rapidi.
const { openApp, setTimer, sel } = require("../lib.cjs");

module.exports = async function (browser, r) {
  // larghezze richieste dal ticket OQ-08
  for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1440, 900]]) {
    const { page: p, errors } = await openApp(browser, { width: w, height: h, clock: true });
    await p.click(sel.preset("Concentrazione")); await p.clock.runFor(800);
    await setTimer(p, 45); await p.clock.runFor(1200);
    const res = await p.evaluate(() => {
      const scope = document.querySelector(".scope").getBoundingClientRect();
      const parts = [...document.querySelectorAll(".readout > span")].map((e) => e.getBoundingClientRect());
      let overlap = false;
      for (let i = 1; i < parts.length; i++) if (parts[i].top < parts[i - 1].bottom - 1) overlap = true;
      const inside = parts.every((x) => x.left >= scope.left - 1 && x.right <= scope.right + 1 && x.bottom <= scope.bottom + 1);
      const chips = [...document.querySelectorAll(".panel:not([hidden]) .chip")];
      return {
        hscroll: document.documentElement.scrollWidth > innerWidth,
        overlap, inside,
        chipOverflow: chips.some((c) => c.scrollWidth > c.clientWidth + 1),
        countdowns: (document.body.innerText.match(/\d+:\d\d/g) || []).length,
        scope: Math.round(scope.height),
      };
    });
    r.check(!res.hscroll && !res.overlap && res.inside && !res.chipOverflow,
      `${w}px: nessuno scorrimento laterale, testi del riquadro senza sovrapposizioni, tessere senza testo tagliato`);
    r.check(res.countdowns === 1, `${w}px: conto alla rovescia mostrato una sola volta (${res.countdowns})`);
    if (w === 390) r.check(res.scope <= 175, `390px: riquadro dell'onda compatto (${res.scope} px, era 225)`);
    if (w === 1440) {
      const gap = await p.evaluate(() => Math.round(document.querySelector(".panel:not([hidden])").getBoundingClientRect().top - document.querySelector(".tabbar").getBoundingClientRect().bottom));
      r.check(gap >= 0 && gap <= 40, `1440px: schede subito sopra i suoni (${gap} px)`);
    }
    if (w <= 390) {
      for (const tab of ["needs", "nature", "solfeggio"]) {
        await p.click(sel.tab(tab)); await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(150);
        const c = await p.evaluate(() => {
          const bar = document.querySelector(".tabbar").getBoundingClientRect().top;
          const chips = [...document.querySelectorAll(".panel:not([hidden]) .chip")];
          return { bar, last: chips[chips.length - 1].getBoundingClientRect().bottom, foot: document.querySelector(".foot").getBoundingClientRect().bottom };
        });
        r.check(c.last <= c.bar && c.foot <= c.bar, `${w}px ${tab}: a fine pagina ultima tessera e nota sopra la barra`);
      }
    }
    r.check(errors.length === 0, `${w}px: nessun errore nella pagina`);
    await p.close();
  }

  // testi contestuali e controlli rapidi
  const { page: p } = await openApp(browser);
  r.check(/Tocca un suono per ascoltarlo/.test(await p.textContent(".panel:not([hidden]) .panel-hint")), "da fermo: 'Tocca un suono per ascoltarlo'");
  r.check((await p.textContent(".hint-line summary")).includes("Usa le cuffie"), "preset binaurale: 'Usa le cuffie'");
  await p.click(sel.tab("nature")); await p.click(sel.preset("Pioggia")); await p.waitForTimeout(400);
  r.check((await p.textContent(".hint-line summary")).includes("Cuffie consigliate"), "suono della natura: 'Cuffie consigliate'");
  await setTimer(p, 25); await p.waitForTimeout(300);
  r.check(/senza interrompere il timer/.test(await p.textContent(".panel:not([hidden]) .panel-hint")), "in ascolto con timer: 'Cambia suono senza interrompere il timer'");
  await p.fill("#main-volume", "40"); await p.waitForTimeout(100);
  r.check((await p.textContent(".quick-value")).trim() === "40%", "volume generale regolabile senza aprire Regola");
  await p.click(".adjust"); await p.waitForTimeout(400);
  const labels = await p.$$eval(".sheet .row label", (els) => els.map((e) => e.textContent));
  r.check(!labels.includes("Volume") && labels.includes("Livello"), "in Regola i singoli suoni si chiamano 'Livello', non 'Volume'");
  await p.close();
};
