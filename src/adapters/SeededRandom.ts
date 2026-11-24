import type { IRandom } from "../domain/ports.js";

/**
 * Deterministic PRNG (mulberry32). The same seed always yields the same
 * sequence, so games and bots are reproducible in tests and replays.
 */
export class SeededRandom implements IRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextInt(upperExclusive: number): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) % upperExclusive;
  }
}
