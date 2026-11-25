import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

const COLLECTION_VALUES: ReadonlyMap<string, number> = new Map([
  ["Leaves", 1],
  ["Wildflowers", 2],
  ["Shells", 3],
  ["Souvenirs", 5],
]);

/**
 * Round rule: sums the value of every collected item, doubling the total
 * when it is 7 or less. Unknown collection types score nothing.
 */
export class CollectionsScorer implements IScoreCategory {
  readonly name = "Collections";

  score(ctx: ScoringContext): CategoryResult {
    let total = 0;
    const counts = new Map<string, number>();
    for (const card of ctx.cards) {
      if (card.collection !== null) {
        counts.set(card.collection, (counts.get(card.collection) ?? 0) + 1);
        total += COLLECTION_VALUES.get(card.collection) ?? 0;
      }
    }
    return {
      name: this.name,
      points: total <= 7 ? total * 2 : total,
      breakdown: counts.size > 0 ? counts : undefined,
    };
  }
}
