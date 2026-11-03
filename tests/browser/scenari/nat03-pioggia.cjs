// NAT-01, NAT-03, NAT-05: ambiente Pioggia personalizzabile (scenari della sezione 10 della CR).
const { openApp, setTimer, text, sel, PAGE } = require("../lib.cjs");

// conta sorgenti e oscillatori audio attivi, per verificare che non si accumulino
const init = () => {
  window.__live = 0;
  for (const C of [AudioBufferSourceNode, OscillatorNode]) {
    const start = C.prototype.start;
    C.prototype.start = function (...a) { window.__live++; this.addEventListener("ended", () => window.__live--); return start.apply(this, a); };
  }
};

const rainState = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("onde-quiete-ambienti")).envs.rain);
const tile = (p) => p.textContent(".panel:not([hidden]) .chip:has(b:text-is('Pioggia')) .chip-desc");
const switchOn = (p, cid) => p.getAttribute(`#env-${cid}-on`, "aria-checked").then((v) => v === "true");

module.exports = async function (browser, r) {
  const { page: p, errors } = await openApp(browser, { clock: true, init });

  await p.click(sel.tab("nature"));
  const names = await p.$$eval(".panel:not([hidden]) .chip b", (els) => els.map((e) => e.textContent));
  r.check(names.join(",") === "Pioggia,Onde del mare,Vento,Camino", `Natura: Pioggia, Mare, Vento, Camino; Temporale non è più una tessera (${names.join(", ")})`);
  r.check((await tile(p)) === "Leggera", "riepilogo iniziale della Pioggia: 'Leggera'");

  await p.click(sel.preset("Pioggia")); await p.clock.runFor(1500);
  r.check((await text(p, sel.play)).includes("Pausa"), "il tocco sulla tessera avvia l'ascolto");
  await setTimer(p, 25); await p.clock.runFor(1000);

  await p.click(".adjust"); await p.waitForTimeout(400);
  r.check((await text(p, "#sheet-title")) === "Personalizza Pioggia", "titolo del pannello: 'Personalizza Pioggia'");
  r.check(!(await p.$("#env-thunder-frequency")) && !(await p.$("#env-wind-strength")), "tuoni e vento spenti: i loro parametri non occupano spazio");

  // tuoni senza vento
  const st0 = await rainState(p);
  await p.click("#env-thunder-on"); await p.clock.runFor(500);
  r.check((await switchOn(p, "thunder")) && !(await switchOn(p, "wind")), "attivo i tuoni lasciando il vento spento: nessun vento aggiunto");
  const st1 = await rainState(p);
  r.check(JSON.stringify(st1.components.rain) === JSON.stringify(st0.components.rain) && JSON.stringify(st1.components.wind) === JSON.stringify(st0.components.wind),
    "attivare i tuoni non cambia pioggia né vento");
  r.check(!!(await p.$("#env-thunder-frequency")) && !!(await p.$("#env-thunder-distance")), "tuoni accesi: compaiono frequenza, distanza e livello");

  // temporale come scorciatoia, poi ogni parametro resta modificabile
  await p.click(".quick-config:has-text('Temporale')"); await p.clock.runFor(500);
  const storm = await rainState(p);
  r.check(storm.base === "storm" && storm.components.thunder.on && storm.components.wind.on, "configurazione rapida Temporale: tuoni e vento accesi");
  r.check((await p.getAttribute(".quick-config:has-text('Temporale')", "aria-pressed")) === "true", "la scorciatoia scelta è indicata");
  r.check(/Tuoni/.test(await tile(p)) && /Vento/.test(await tile(p)), `riepilogo della tessera aggiornato: ${await tile(p)}`);

  // burrasca: cambia il vento, il resto no
  const before = await rainState(p);
  await p.fill("#env-wind-strength", "100"); await p.clock.runFor(300);
  const gale = await rainState(p);
  r.check(gale.components.wind.strength === 100, "forza del vento portata a Burrasca");
  r.check(JSON.stringify(gale.components.rain) === JSON.stringify(before.components.rain) && JSON.stringify(gale.components.thunder) === JSON.stringify(before.components.thunder),
    "Burrasca non cambia pioggia né tuoni");
  r.check(/restano|Si spegne/.test(await text(p, sel.timerText)) && (await p.inputValue("#main-volume")) === "70", "Burrasca non cambia volume generale né timer");
  r.check((await p.getAttribute(".quick-config:has-text('Temporale')", "aria-pressed")) === "false", "dopo una modifica la scorciatoia non risulta più attiva (configurazione personalizzata)");

  // spegnere il vento conserva i valori per la riattivazione
  await p.click("#env-wind-on"); await p.clock.runFor(300);
  r.check(!(await p.$("#env-wind-strength")) && !/Vento|Burrasca/.test(await tile(p)), "vento spento: controlli nascosti e riepilogo senza vento");
  await p.click("#env-wind-on"); await p.clock.runFor(300);
  r.check((await p.inputValue("#env-wind-strength")) === "100", "riacceso: la forza del vento è quella lasciata");

  // tornare a pioggia leggera e di nuovo al temporale non interrompe il timer
  const t0 = await text(p, sel.timerText);
  await p.click(".quick-config:has-text('Pioggia leggera')"); await p.clock.runFor(1000);
  await p.click(".quick-config:has-text('Temporale')"); await p.clock.runFor(1000);
  r.check(/Si spegne tra 2[34]:/.test(await text(p, sel.timerText)) && (await text(p, sel.play)).includes("Pausa"), `leggera → temporale → leggera: audio e timer continuano (${t0} → ${await text(p, sel.timerText)})`);

  // cambi rapidi ripetuti: nessun accumulo di sorgenti
  await p.clock.runFor(3000);
  const liveBefore = await p.evaluate(() => window.__live);
  for (let i = 0; i < 6; i++) { await p.click("#env-wind-on"); await p.click("#env-thunder-on"); await p.clock.runFor(200); }
  await p.clock.runFor(4000);
  const liveAfter = await p.evaluate(() => window.__live);
  r.check(liveAfter <= liveBefore + 2, `12 accensioni e spegnimenti rapidi: sorgenti attive ${liveBefore} → ${liveAfter}`);

  // in pausa le regolazioni non avviano l'audio
  await p.click(".text-btn.strong"); await p.waitForTimeout(300);
  await p.click(sel.play); await p.clock.runFor(2500);
  await p.click(".adjust"); await p.waitForTimeout(300);
  await p.fill("#env-rain-intensity", "100"); await p.clock.runFor(1000);
  r.check((await text(p, sel.play)).includes("Riprendi") && (await rainState(p)).components.rain.intensity === 100, "in pausa la configurazione si aggiorna e l'audio resta fermo");
  await p.click(".text-btn.strong"); await p.waitForTimeout(300);

  // tutti i livelli a zero
  await p.click(".adjust"); await p.waitForTimeout(300);
  for (const id of ["#env-rain-level", "#env-thunder-level", "#env-wind-level"]) if (await p.$(id)) await p.fill(id, "0");
  await p.waitForTimeout(200);
  r.check((await tile(p)) === "Nessun suono attivo" && /Nessun suono attivo/.test(await text(p, ".sheet-summary")), "tutti i livelli a zero: 'Nessun suono attivo'");
  r.check(!!(await p.$("#env-rain-level")), "i controlli restano utilizzabili");
  await p.click(".text-btn:has-text('Ripristina')"); await p.waitForTimeout(200);
  r.check((await tile(p)) === "Leggera", "Ripristina riporta alla configurazione iniziale");
  await p.click(".quick-config:has-text('Pioggia intensa')"); await p.waitForTimeout(200);
  await p.click(".text-btn.strong"); await p.waitForTimeout(300);

  // Studio mantiene il suo sottofondo dedicato
  await p.click(sel.tab("needs")); await p.click(sel.preset("Studio")); await p.clock.runFor(500);
  await p.click(".adjust"); await p.waitForTimeout(300);
  const studioNature = await p.inputValue("#nature");
  const studioType = await p.textContent(".sheet .pills .pill[aria-checked=true]:has-text('Pioggia')").catch(() => "");
  r.check(studioNature === "30" && studioType === "Pioggia", `Studio mantiene il suo sottofondo (pioggia al 30%: ${studioNature})`);
  await p.click(".text-btn.strong"); await p.waitForTimeout(200);

  // ritorno a Pioggia: ultime impostazioni
  await p.click(sel.tab("nature")); await p.click(sel.preset("Pioggia")); await p.clock.runFor(500);
  r.check(/Intensa/.test(await text(p, ".now-desc")), "ritorno a Pioggia: ritrovo le ultime impostazioni");

  // riapertura dell'app
  await p.reload(); await p.waitForTimeout(500);
  await p.click(sel.tab("nature"));
  r.check(/Intensa/.test(await tile(p)), "riaprendo l'app la configurazione della Pioggia è quella lasciata");

  r.check(errors.length === 0, `nessun errore nella pagina${errors.length ? ": " + errors[0] : ""}`);
  await p.close();

  // migrazione dai vecchi preset: Temporale selezionato, Pioggia e Temporale personalizzati
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const m = await ctx.newPage();
  const merrs = []; m.on("pageerror", (e) => merrs.push(e.message));
  await m.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("onde-quiete-preset", JSON.stringify("storm"));
    localStorage.setItem("onde-quiete-tweaks", JSON.stringify({ rain: { nature: 40 }, storm: { nature: 90, noise: 20, noiseType: "brown" }, relax: { beat: 9 } }));
  });
  await m.goto(PAGE); await m.waitForTimeout(500);
  const migrated = await m.evaluate(() => ({
    envs: JSON.parse(localStorage.getItem("onde-quiete-ambienti")),
    tweaks: JSON.parse(localStorage.getItem("onde-quiete-tweaks")),
    selected: document.querySelector(".mode").textContent,
  }));
  const rain = migrated.envs.envs.rain;
  r.check(migrated.envs.version === 1 && rain.base === "storm" && rain.components.thunder.on, "migrazione: il vecchio Temporale selezionato diventa Pioggia con base Temporale");
  r.check(rain.components.rain.level === 90 && rain.components.noise.on && rain.components.noise.color === "brown", "migrazione: livello e rumore di fondo del Temporale conservati");
  r.check(!migrated.tweaks.storm && !migrated.tweaks.rain && migrated.tweaks.relax?.beat === 9, "migrazione: Esigenze intatte, vecchie voci rimosse");
  r.check(/Pioggia/.test(migrated.selected), "migrazione: la tessera selezionata è Pioggia");

  // dati rovinati: l'app si apre comunque
  await m.evaluate(() => localStorage.setItem("onde-quiete-ambienti", "{ rotto"));
  await m.reload(); await m.waitForTimeout(500);
  r.check((await m.$$(".chip")).length > 0, "dati degli ambienti rovinati: l'app si apre con i valori predefiniti");
  r.check(merrs.length === 0, "migrazione e recupero senza errori");
  await ctx.close();
};
