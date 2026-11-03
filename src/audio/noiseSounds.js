// Rumori colorati in loop: bianco, rosa (filtro di Paul Kellet) e marrone (integrato).
// Il loop è chiuso con una dissolvenza: senza, il rumore marrone dava un click ogni 6 s
// (salto alla giunzione 6 volte oltre il 99,9° percentile dei salti normali, OQ-10).

import { foldLoop } from "./bufferTools.js";

const NOISE_SECONDS = 6;
const FADE_SECONDS = 0.08;

export function makeNoiseBuffer(ctx, type) {
  const len = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const fade = Math.floor(ctx.sampleRate * FADE_SECONDS);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = new Float32Array(len + fade);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len + fade; i++) {
      const w = Math.random() * 2 - 1;
      if (type === "white") {
        d[i] = w * 0.5;
      } else if (type === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    const looped = new Float32Array(len);
    foldLoop(d, len, fade, looped);
    buf.copyToChannel(looped, ch);
  }
  return buf;
}
