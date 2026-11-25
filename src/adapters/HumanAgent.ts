import type { Card } from "../domain/Card.js";
import type {
  CardPickPurpose,
  IAgent,
  IMessageChannel,
} from "../domain/ports.js";

/** Human player: prompts via an IMessageChannel and returns the chosen card. */
export class HumanAgent implements IAgent {
  constructor(private readonly channel: IMessageChannel) {}

  async chooseCard(
    hand: Card[],
    purpose: CardPickPurpose = "draft",
  ): Promise<Card> {
    await this.channel.send(this.formatHand(hand));
    const prompt =
      purpose === "throw"
        ? "Type the letter of the card to throw"
        : "Type the letter of the card to draft";
    await this.channel.send(prompt);

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
      .map((c) => {
        const animalPart = c.animal != null ? ` Animal: ${c.animal}` : "";
        const collectionPart = c.collection != null ? `, Collection: ${c.collection}` : "";
        return ` [${c.siteLetter}] (${c.number}) ${c.name}${animalPart}${collectionPart}`
      })
      .join("\n");
    return `Your hand:\n${cards}`;
  }
}
