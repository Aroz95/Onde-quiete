import { useEffect, useRef } from "react";

// Onda decorativa: la sinusoide segue la portante, l'inviluppo il battimento.
// Non misura il suono né chi ascolta: è solo un accompagnamento visivo.
//
// Ticket OQ-09 — consumo e movimento:
//  - l'animazione gira solo se l'audio suona, la pagina è visibile e non è chiesto
//    il movimento ridotto; in tutti gli altri casi si disegna un solo fotogramma statico
//  - il fotogramma statico si ridisegna solo quando cambiano parametri o dimensioni
//  - il canvas segue larghezza, altezza e densità dei pixel (zoom, rotazione, schermo esterno)
//  - nessun legame con il motore audio: disegnare o fermarsi non tocca il suono

// rumore "fisso" per i fotogrammi statici: stesso valore per la stessa x, niente tremolio
function stableNoise(x) {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

function drawFrame(g, w, h, p, ph, animated) {
  g.clearRect(0, 0, w, h);
  const amp = p.playing ? 1 : 0.25;
  const mid = h * 0.5;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.lineWidth = k ? 1 : 2;
    g.strokeStyle = k ? "rgba(180,167,255,.25)" : p.color;
    for (let x = 0; x <= w; x += 2) {
      // con battimento 0 (tono puro) l'inviluppo resta piatto
      const env = p.beat > 0 ? Math.cos((x / w) * Math.PI * 2 * (Math.min(p.beat, 12) / 4) + ph * (k ? 0.7 : 1)) : 0.8;
      const grain = p.noise && p.playing ? (animated ? Math.random() - 0.5 : stableNoise(x + k * 7)) * p.noise * 0.12 : 0;
      const y = mid + Math.sin(x * 0.18 * (p.car / 200) + ph * 6 + k) * env * (h * 0.22) * amp * (p.tone ? 1 : 0.2) + grain;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
}

export default function Scope({ beat, car, tone, noise, nature, playing, color }) {
  const canvasRef = useRef(null);
  const params = useRef({});
  params.current = { beat, car, tone, noise: noise + (nature || 0), playing, color };
  const refresh = useRef(() => {});

  useEffect(() => {
    const cv = canvasRef.current;
    const g = cv.getContext("2d");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = motionQuery.matches;
    let ph = 0;
    let raf = null;

    // dimensioni del canvas in pixel reali; true se sono cambiate
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
      if (cv.width !== bw || cv.height !== bh) {
        cv.width = bw;
        cv.height = bh;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    const shouldAnimate = () => params.current.playing && !reduce && document.visibilityState === "visible";

    const frame = () => {
      raf = null;
      if (!shouldAnimate()) { drawStatic(); return; }
      const { w, h } = fit();
      drawFrame(g, w, h, params.current, ph, true);
      ph += 0.004 * Math.max(1, params.current.beat / 4);
      raf = requestAnimationFrame(frame);
    };

    function drawStatic() {
      const { w, h } = fit();
      if (w && h) drawFrame(g, w, h, params.current, ph, false);
    }

    // decide se animare o disegnare un fotogramma fermo
    const update = () => {
      if (shouldAnimate()) {
        if (raf == null) raf = requestAnimationFrame(frame);
      } else {
        if (raf != null) { cancelAnimationFrame(raf); raf = null; }
        drawStatic();
      }
    };
    refresh.current = update;

    // dimensioni: larghezza e altezza
    const ro = new ResizeObserver(update);
    ro.observe(cv);

    // densità dei pixel: cambia con zoom del browser o spostando la finestra su un altro schermo
    let dprQuery;
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDpr);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      dprQuery.addEventListener("change", onDpr);
    };
    function onDpr() { watchDpr(); update(); }
    watchDpr();

    // preferenza di movimento cambiata durante la sessione
    const onMotion = (e) => { reduce = e.matches; update(); };
    motionQuery.addEventListener("change", onMotion);

    // pagina nascosta: niente disegno (l'audio continua); al ritorno si riprende
    document.addEventListener("visibilitychange", update);

    update();
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      ro.disconnect();
      dprQuery?.removeEventListener("change", onDpr);
      motionQuery.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  // parametri cambiati: riparte l'animazione oppure si ridisegna il fotogramma fermo
  useEffect(() => {
    refresh.current();
  }, [beat, car, tone, noise, nature, playing, color]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
