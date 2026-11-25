import type { Card } from "./Card.js";
import type { IRandom } from "./ports.js";

/**
 * Mutable deck of cards. Shuffle takes an injected IRandom so it is
 * deterministic in tests (DIP) and reusable with a seeded RNG in production.
 */
export class Deck {
  private readonly pile: Card[];

  constructor(cards: readonly Card[]) {
    this.pile = [...cards];
  }

  get size(): number {
    return this.pile.length;
  }

  /** Read-only snapshot of the current card order. */
  get cards(): readonly Card[] {
    return [...this.pile];
  }

  /** Fisher-Yates shuffle using the injected number source. */
  shuffle(rng: IRandom): void {
    for (let i = this.pile.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      [this.pile[i], this.pile[j]] = [this.pile[j], this.pile[i]];
    }
  }

  /** Removes and returns the top card. */
  draw(): Card {
    const card = this.pile.pop();
    if (card === undefined) {
      throw new Error("Cannot draw from an empty deck");
    }
    return card;
  }
}
