import type { Card } from "../domain/Card.js";
import type { IAgent, IRandom } from "../domain/ports.js";

/** Bot player: picks a uniform random card using an injected IRandom. */
export class RandomBotAgent implements IAgent {
  constructor(private readonly rng: IRandom) {}

  async chooseCard(hand: Card[]): Promise<Card> {
    if (hand.length === 0) {
      throw new Error("Cannot choose a card from an empty hand");
    }
    return hand[this.rng.nextInt(hand.length)];
  }
}
