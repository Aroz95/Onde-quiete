// Misure audio di Onde Quiete (OQ-10): buffer, giunzioni dei loop, mix dei preset,
// canali del binaurale e loudness pesata K. Vedi README.md in questa cartella.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto("file://" + require("path").join(__dirname, "index.html"));
  const buf = await p.evaluate(() => window.buffers());
  console.log("BUFFER                ms   durata  MB    picco/medio  giunzione L (salto, ×mediana, ×p99.9, percentile) | R");
  for (const [k, v] of Object.entries(buf)) console.log(k.padEnd(18), String(v.ms).padStart(5), (v.secondi + " s").padStart(7), String(v.MB).padStart(5), (v.crestDb + " dB").padStart(10), "  ", v.giunzione.map((g) => g.salto + ", " + g.suMediana + "×, " + g.suP999 + "×, " + g.percentile + "%").join("  |  "));
  console.log("\nMIX PER PRESET (dBFS)   volume 70%: picco  medio  saturati | volume 100%: picco  medio  saturati");
  const mix = await p.evaluate(() => window.mix());
  for (const [k, v] of Object.entries(mix)) console.log(k.padEnd(10), String(v.def.picco).padStart(16), String(v.def.rms).padStart(7), String(v.def.saturati).padStart(9), " |", String(v.max.picco).padStart(15), String(v.max.rms).padStart(7), String(v.max.saturati).padStart(9));
  console.log("\nCANALI BINAURALE:", JSON.stringify(await p.evaluate(() => window.channels())));
  const r = await p.evaluate(() => window.lufs());
  const vals = Object.values(r); const med = [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
  console.log("\nLOUDNESS (pesata K, volume 70%)");
  for (const [k, v] of Object.entries(r)) console.log(k.padEnd(8), (v + " LUFS").padStart(11), ((v - med >= 0 ? "+" : "") + (v - med).toFixed(1) + " dal mediano").padStart(18));
  console.log("mediano", med, "· escursione", (Math.max(...vals) - Math.min(...vals)).toFixed(1), "dB");
  await b.close();
})();
