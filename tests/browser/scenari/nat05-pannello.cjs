// NAT-05: pannello "Personalizza Pioggia": accessibilità e layout su schermi stretti.
const { openApp, sel } = require("../lib.cjs");

module.exports = async function (browser, r) {
  for (const width of [360, 390]) {
    const { page: p, errors } = await openApp(browser, { width, height: width === 360 ? 740 : 844 });
    await p.click(sel.tab("nature")); await p.click(sel.preset("Pioggia")); await p.waitForTimeout(400);
    await p.focus(".adjust"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
    // tutto acceso: configurazione più lunga del pannello
    await p.click(".quick-config:has-text('Temporale')"); await p.waitForTimeout(200);
    if (width === 390) {
      r.check(/button "Temporale" \[pressed\]/.test(await p.locator(".sheet").ariaSnapshot()), "la configurazione rapida scelta è annunciata come premuta");
    }
    await p.click("#env-noise-on"); await p.waitForTimeout(300);
    if (width === 390) {
      r.check(!/button "Temporale" \[pressed\]/.test(await p.locator(".sheet").ariaSnapshot()), "dopo una modifica la scorciatoia non risulta più premuta");
    }

    if (width === 390) {
      const aria = await p.locator(".sheet").ariaSnapshot();
      r.check(/dialog "Personalizza Pioggia"/.test(await p.locator("body").ariaSnapshot()), "il pannello è letto come finestra 'Personalizza Pioggia'");
      r.check(/switch "Tuoni" \[checked\]/.test(aria) && /switch "Vento" \[checked\]/.test(aria) && /switch "Rumore colorato"/.test(aria),
        "interruttori letti come 'interruttore' con nome e stato");
      r.check(/slider "Intensità, pioggia"/.test(aria) && /slider "Vicinanza, tuoni"/.test(aria) && /slider "Potenza, tuoni"/.test(aria) && /slider "Mix distanze, tuoni"/.test(aria) && /slider "Forza, vento"/.test(aria),
        "ogni cursore indica componente e fenomeno");
      const vt = await p.$$eval(".sheet input[type=range]", (els) => Object.fromEntries(els.map((e) => [e.id, e.getAttribute("aria-valuetext")])));
      r.check(vt["env-rain-intensity"] === "Battente" && vt["env-thunder-frequency"] === "Occasionali" && /%$/.test(vt["env-rain-level"]),
        `valori comprensibili: intensità '${vt["env-rain-intensity"]}', frequenza '${vt["env-thunder-frequency"]}', livello '${vt["env-rain-level"]}'`);

      let inside = true;
      for (let i = 0; i < 30; i++) { await p.keyboard.press("Tab"); inside &&= await p.evaluate(() => !!document.activeElement.closest(".sheet")); }
      r.check(inside, "30 pressioni di Tab: il focus non esce dal pannello");
      // l'interruttore si usa da tastiera
      await p.focus("#env-wind-on"); await p.keyboard.press("Space"); await p.waitForTimeout(200);
      r.check((await p.getAttribute("#env-wind-on", "aria-checked")) === "false" && !(await p.$("#env-wind-strength")), "interruttore attivabile con la barra spaziatrice");
      await p.keyboard.press("Space"); await p.waitForTimeout(200);
    }

    // le parole più lunghe delle scale ("Lontanissimi", "Rarissimi") devono stare nella colonna del valore
    for (const id of ["#env-thunder-distance", "#env-thunder-frequency"]) { await p.focus(id); await p.keyboard.press("Home"); }
    await p.waitForTimeout(200);
    const words = await p.$$eval(".row output.word", (els) => els.map((e) => ({ t: e.textContent, over: e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > e.closest(".row").getBoundingClientRect().right + 0.5 })));
    r.check(words.some((w) => w.t === "Lontanissimi") && words.every((w) => !w.over),
      `${width}px: i valori a parole stanno nella loro colonna (${words.filter((w) => w.over).map((w) => w.t).join(", ") || "nessuno sborda"})`);
    const layout = await p.evaluate(() => {
      const body = document.querySelector(".sheet-body");
      const fine = document.querySelector(".text-btn.strong").getBoundingClientRect();
      return { hscroll: body.scrollWidth > body.clientWidth + 1, fine: fine.right <= innerWidth && fine.top >= 0 };
    });
    r.check(!layout.hscroll && layout.fine, `${width}px: pannello senza scorrimento orizzontale, 'Fine' visibile`);
    await p.$eval(".sheet-body", (el) => (el.scrollTop = el.scrollHeight)); await p.waitForTimeout(200);
    const lastOk = await p.evaluate(() => {
      const ranges = [...document.querySelectorAll(".sheet input[type=range]")];
      const last = ranges[ranges.length - 1].getBoundingClientRect();
      return last.bottom <= innerHeight && last.top >= 0;
    });
    r.check(lastOk, `${width}px: scorrendo si raggiunge l'ultimo controllo`);
    if (width === 390) await p.screenshot({ path: require("path").join(__dirname, "..", ".build", "pannello-pioggia.png") });

    await p.keyboard.press("Escape"); await p.waitForTimeout(400);
    r.check(await p.evaluate(() => document.activeElement.classList.contains("adjust")), `${width}px: alla chiusura il focus torna su Regola`);
    r.check(errors.length === 0, `${width}px: nessun errore nella pagina`);
    await p.close();
  }
};
