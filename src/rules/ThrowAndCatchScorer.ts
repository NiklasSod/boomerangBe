import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

/**
 * Round rule: scores the absolute difference between the number on the
 * Throw card (first card in the draft) and the number on the Catch card
 * (final card in the draft). The number is the card's collection_id.
 */
export class ThrowAndCatchScorer implements IScoreCategory {
  readonly name = "Throw and Catch";

  score(ctx: ScoringContext): CategoryResult {
    const { cards } = ctx;
    if (cards.length < 2) {
      throw new Error("Throw and Catch needs a throw card and a catch card");
    }
    const throwCard = cards[0];
    const catchCard = cards[cards.length - 1];
    return {
      name: this.name,
      points: Math.abs(throwCard.number - catchCard.number),
    };
  }
}
