import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

/**
 * Round rule: sums the value of every collected item, doubling the total
 * when it is 7 or less. Values come from the card set being played, so the
 * same rule works for Australia, Europe, USA, ... Unknown types score nothing.
 */
export class CollectionsScorer implements IScoreCategory {
  readonly name = "Collections";

  constructor(
    private readonly collectionValues: ReadonlyMap<string, number>,
  ) {}

  score(ctx: ScoringContext): CategoryResult {
    let total = 0;
    const counts = new Map<string, number>();
    for (const card of ctx.cards) {
      if (card.collection !== null) {
        counts.set(card.collection, (counts.get(card.collection) ?? 0) + 1);
        total += this.collectionValues.get(card.collection) ?? 0;
      }
    }
    return {
      name: this.name,
      points: total <= 7 ? total * 2 : total,
      breakdown: counts.size > 0 ? counts : undefined,
    };
  }
}
