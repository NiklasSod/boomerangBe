import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

/**
 * Round rule: scores each matching pair of animals. Three-of-a-kind counts
 * as one pair, four-of-a-kind as two pairs. Values come from the card set
 * being played. Unknown animals score nothing.
 */
export class AnimalsScorer implements IScoreCategory {
  readonly name = "Animals";

  constructor(private readonly animalValues: ReadonlyMap<string, number>) {}

  score(ctx: ScoringContext): CategoryResult {
    const counts = new Map<string, number>();
    for (const card of ctx.cards) {
      if (card.animal !== null) {
        counts.set(card.animal, (counts.get(card.animal) ?? 0) + 1);
      }
    }
    let points = 0;
    const pairs = new Map<string, number>();
    for (const [animal, count] of counts) {
      const pairCount = Math.floor(count / 2);
      if (pairCount > 0) {
        pairs.set(animal, pairCount);
        points += pairCount * (this.animalValues.get(animal) ?? 0);
      }
    }
    return {
      name: this.name,
      points,
      breakdown: pairs.size > 0 ? pairs : undefined,
    };
  }
}
