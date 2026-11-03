// NAT-02, NAT-06: comportamento audio del motore degli ambienti, misurato sul segnale in uscita.
const { buildTestPage } = require("../lib.cjs");

module.exports = async function (browser, r) {
  const url = buildTestPage("motore");
  const p = await browser.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(url);
  const run = (name) => p.evaluate((n) => window.prove[n](), name);

  const f = await run("frequenza");
  r.info(`tuoni in 4 minuti: rari ${f.rari}, frequenti ${f.frequenti}`);
  r.check(f.frequenti > f.rari * 3, "più frequenza, più tuoni nel tempo");

  const s = await run("spegnimento");
  r.info(`tuoni spenti nel pieno di un tuono: ${s.livelloPrima} dB → ${s.livelloDopo1s} dB dopo 1 s → ${s.livelloDopo} dB dopo`);
  r.check(s.livelloDopo1s < s.livelloPrima - 15, "spegnendo i tuoni durante una coda, la coda sfuma in breve");
  r.check(s.nuoviEventiDopo === 0 && s.livelloDopo < -80, "dopo lo spegnimento non arrivano nuovi tuoni");

  const pa = await run("pausa");
  const mx = await run("mix");
  r.info(`tuoni lontani con mix "Uguali": ${mx.uguali.schiocchi} schiocchi su ${mx.uguali.tuoni}; con mix "Misti": ${mx.misti.schiocchi} su ${mx.misti.tuoni}`);
  r.check(mx.uguali.schiocchi === 0 && mx.misti.schiocchi >= mx.misti.tuoni * 0.3 && mx.misti.schiocchi < mx.misti.tuoni,
    "mix delle distanze: tuoni tutti uguali con 'Uguali', di ogni distanza con 'Misti'");

  const at = await run("attenuazione");
  const { forte: f2, muto } = at;
  r.info(`pioggia con un tuono violento vicinissimo: ${f2.prima} → ${f2.durante} → ${f2.dopo} dB; con tuoni a livello zero: ${muto.prima} → ${muto.durante} dB`);
  r.check(f2.durante < f2.prima - 4 && Math.abs(f2.dopo - f2.prima) < 1.5, "durante un tuono violento la pioggia si abbassa, poi torna al suo livello");
  r.check(Math.abs(muto.durante - muto.prima) < 1, "con i tuoni a livello zero la pioggia non si abbassa");

  r.info(`pausa di 120 s: eventi in pausa ${pa.eventiInPausa}, nei primi 10 s dopo la ripresa ${pa.eventiNeiPrimi10sDopoLaRipresa}, primo dopo ${pa.primoDopoRipresa} s, distanza minima ${pa.distanzaMinimaDopoRipresa} s`);
  r.check(pa.eventiInPausa === 0 && pa.livelloInPausa < -100, `in pausa nessun tuono suona (livello ${pa.livelloInPausa} dB)`);
  // un recupero degli arretrati porterebbe circa 17 tuoni insieme (120 s di pausa con media 7 s);
  // il ritmo normale ne consente al massimo 3 in 10 s, distanziati di almeno 4 s
  r.check(pa.eventiNeiPrimi10sDopoLaRipresa <= 3 && pa.distanzaMinimaDopoRipresa >= 4 && pa.primoDopoRipresa >= 2,
    "alla ripresa nessun tuono arretrato riprodotto in gruppo: ritmo normale, distanza minima rispettata");

  const t = await run("tardivo");
  r.check(t.sorgentiAvviate === 0 && t.livello < -100, `ambiente abbandonato durante la preparazione: il caricamento tardivo non lo riattiva (${t.sorgentiAvviate} sorgenti)`);

  const ft = await run("fineTimer");
  r.info(`fine timer durante un temporale: ${ft.prima} dB → ${ft.duranteDissolvenza} dB in dissolvenza → ${ft.allaScadenza} dB alla scadenza → ${ft.dopo} dB dopo`);
  r.check(ft.duranteDissolvenza < ft.prima && ft.allaScadenza < ft.prima - 30 && ft.dopo < ft.prima - 40, "alla fine del timer tutto il mix (pioggia, tuoni, vento) sfuma insieme");

  const tr = await run("transizione");
  r.info(`intensità da leggera a battente dal vivo: ${tr.prima} → ${tr.dopo} dB, salto al cambio ${tr.saltoAlCambioSuP999}× il 99,9° percentile`);
  r.check(tr.saltoAlCambioSuP999 < 1.5, "cambio di intensità dal vivo senza scatti");
  r.check(Math.abs(tr.dopo - tr.prima) < 3, "da leggera a battente senza salto brusco di livello");

  const so = await run("sorgenti");
  r.info(`sorgenti attive dopo ogni cambio: ${so.attiveDopoOgniCambio}`);
  r.check(so.finali <= 16, "accensioni e spegnimenti ripetuti: le sorgenti non si accumulano");

  r.check(errors.length === 0, `nessun errore${errors.length ? ": " + errors[0] : ""}`);
  await p.close();
};
