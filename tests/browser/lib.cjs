// Strumenti comuni per le prove nel browser (Chromium headless con Playwright).

const path = require("path");
const fs = require("fs");

const BUILD_DIR = path.join(__dirname, ".build");
const PAGE = "file://" + path.join(BUILD_DIR, "index.html");

/** Compila l'app con esbuild in tests/browser/.build (senza font esterni: la prova non va in rete). */
function buildApp() {
  const esbuild = require("esbuild");
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, "../../src/main.jsx")],
    bundle: true,
    jsx: "automatic",
    outdir: BUILD_DIR,
    logLevel: "error",
    // di norma React è in node_modules; NODE_PATH serve solo con dipendenze installate altrove
    nodePaths: (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
  });
  fs.writeFileSync(
    path.join(BUILD_DIR, "index.html"),
    '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '<link rel="stylesheet" href="main.css"></head><body><div id="root"></div><script src="main.js"></script></body></html>',
  );
}

/** Raccoglie l'esito delle verifiche di uno scenario. */
function createReport(name) {
  const results = [];
  return {
    name,
    results,
    check(condition, message) {
      results.push({ ok: !!condition, message });
      console.log(`  ${condition ? "✅" : "❌"} ${message}`);
    },
    info(message) {
      console.log(`     ${message}`);
    },
  };
}

/** Apre l'app in una nuova pagina; `init` gira prima del codice della pagina. */
async function openApp(browser, { width = 390, height = 844, init, clock, reducedMotion } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (clock) await page.clock.install({ time: new Date("2026-11-03T22:00:00") });
  if (init) await page.addInitScript(init);
  if (reducedMotion) await page.emulateMedia({ reducedMotion });
  await page.goto(PAGE);
  await page.waitForTimeout(400);
  return { page, errors };
}

const MIN = 60000;

// selettori ricorrenti
const sel = {
  play: ".play",
  timerButton: ".timer-btn",
  timerText: ".timer-text",
  timerPill: (label) => `.timer-pop .pill:has-text('${label}')`,
  preset: (name) => `.panel:not([hidden]) .chip:has(b:text-is('${name}'))`,
  tab: (id) => `#tab-${id}`,
};

async function setTimer(page, minutes) {
  await page.click(sel.timerButton);
  await page.click(sel.timerPill(minutes ? `${minutes} min` : "Disattivato"));
}

const text = (page, s) => page.evaluate((q) => document.querySelector(q)?.textContent.trim() ?? "", s);

module.exports = { buildApp, createReport, openApp, setTimer, text, sel, MIN, PAGE };
