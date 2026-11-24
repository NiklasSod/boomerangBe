import type { Card } from "../domain/Card.js";
import type { IAgent, IMessageChannel } from "../domain/ports.js";

/** Human player: prompts via an IMessageChannel and returns the chosen card. */
export class HumanAgent implements IAgent {
  constructor(private readonly channel: IMessageChannel) {}

  async chooseCard(hand: Card[]): Promise<Card> {
    await this.channel.send(this.formatHand(hand));
    await this.channel.send("Type the letter of the card to draft");

    for (;;) {
      const answer = (await this.channel.read()).trim();
      const card = hand.find(
        (c) => c.siteLetter.toLowerCase() === answer.toLowerCase(),
      );
      if (card !== undefined) {
        return card;
      }
      await this.channel.send(`"${answer}" is not in your hand. Try again.`);
    }
  }

  private formatHand(hand: Card[]): string {
    const cards = hand
      .map((c) => `${c.name} [${c.siteLetter}] (${c.number})`)
      .join("  ");
    return `Your hand:\n${cards}`;
  }
}
