// Esegue le prove nel browser: compila l'app, apre Chromium headless e lancia gli scenari.
// Uso: npm run test:browser            (tutti)
//      npm run test:browser -- oq04    (solo gli scenari il cui nome contiene "oq04")
const fs = require("fs");
const path = require("path");
const { buildApp, createReport } = require("./lib.cjs");

(async () => {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.error("Serve Playwright: npm install --no-save playwright && npx playwright install chromium");
    process.exit(2);
  }
  try {
    buildApp();
  } catch {
    console.error("\nLa compilazione dell'app non è riuscita: vedi gli errori sopra.");
    process.exit(2);
  }
  const filter = process.argv[2] || "";
  const dir = path.join(__dirname, "scenari");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".cjs") && f.includes(filter)).sort();
  const browser = await chromium.launch();
  const summary = [];
  for (const f of files) {
    const r = createReport(f.replace(".cjs", ""));
    console.log(`\n▸ ${r.name}`);
    const t0 = Date.now();
    try {
      await require(path.join(dir, f))(browser, r);
    } catch (e) {
      r.check(false, `lo scenario si è interrotto: ${e.message.split("\n")[0]}`);
    }
    const failed = r.results.filter((x) => !x.ok).length;
    summary.push({ name: r.name, total: r.results.length, failed, s: ((Date.now() - t0) / 1000).toFixed(1) });
  }
  await browser.close();
  console.log("\nRiepilogo");
  for (const s of summary) console.log(`  ${s.failed ? "❌" : "✅"} ${s.name.padEnd(22)} ${s.total - s.failed}/${s.total} verifiche  (${s.s} s)`);
  const bad = summary.reduce((a, s) => a + s.failed, 0);
  const all = summary.reduce((a, s) => a + s.total, 0);
  console.log(`\n${all - bad}/${all} verifiche riuscite`);
  process.exit(bad ? 1 : 0);
})();
