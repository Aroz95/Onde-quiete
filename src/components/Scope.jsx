import { useEffect, useRef } from "react";

// Oscilloscopio decorativo: la sinusoide segue la portante, l'inviluppo il battimento.
export default function Scope({ beat, car, tone, noise, playing, color }) {
  const canvasRef = useRef(null);
  const params = useRef({});
  params.current = { beat, car, tone, noise, playing, color };

  useEffect(() => {
    const cv = canvasRef.current;
    const g = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ph = 0;
    let raf;

    const draw = () => {
      const p = params.current;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== w * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const amp = p.playing ? 1 : 0.25;
      const mid = h * 0.42;

      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.lineWidth = k ? 1 : 2;
        g.strokeStyle = k ? "rgba(180,167,255,.25)" : p.color;
        for (let x = 0; x <= w; x += 2) {
          const env = Math.cos((x / w) * Math.PI * 2 * (Math.min(p.beat, 12) / 4) + ph * (k ? 0.7 : 1));
          const y =
            mid +
            Math.sin(x * 0.18 * (p.car / 200) + ph * 6 + k) * env * (h * 0.22) * amp * (p.tone ? 1 : 0.2) +
            (p.noise && p.playing ? (Math.random() - 0.5) * p.noise * 0.12 : 0);
          if (x) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
      }
      if (!reduce) ph += p.playing ? 0.004 * Math.max(1, p.beat / 4) : 0.002;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
