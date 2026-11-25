import { randomInt } from "node:crypto";
import { SeededRandom } from "./SeededRandom.js";
import type { IRandom } from "../domain/ports.js";

/**
 * Production RNG. Defaults to a random seed so every game starts
 * differently; pass a seed to make a game reproducible.
 */
export function createRandom(seed?: number): IRandom {
  return new SeededRandom(seed ?? randomInt(0, 0xffffffff));
}
