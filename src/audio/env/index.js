// Punto d'ingresso degli ambienti naturali: costruisce il motore giusto per ogni ambiente.
// In questa fase solo la Pioggia ha il motore a componenti; Mare, Vento e Camino seguiranno (NAT-04).

import { createRainEnvironment } from "./rainEnvironment.js";

const FACTORIES = { rain: createRainEnvironment };

export function hasEnvironmentEngine(envId) {
  return envId in FACTORIES;
}

export function createEnvironment(envId, ctx, destination, config, options) {
  const make = FACTORIES[envId];
  return make ? make(ctx, destination, config, options) : null;
}
