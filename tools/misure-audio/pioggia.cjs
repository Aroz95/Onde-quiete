// Misure dell'ambiente Pioggia. Uso: vedi README.md in questa cartella.
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.log("errore:", e.message));
  await p.goto("file://" + path.join(__dirname, "pioggia.html"));
  const which = process.argv[2] || "intensita,tuoni,vento,peggiore";
  for (const fn of which.split(",")) {
    const r = await p.evaluate((f) => window[f](), fn);
    console.log("\n" + fn.toUpperCase());
    if (r.rows) { console.table(r.rows); console.log("compensazione attuale:", r.comp.join(", ")); }
    else console.table(r);
  }
  await b.close();
})();
