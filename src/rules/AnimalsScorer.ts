import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

const ANIMAL_VALUES: ReadonlyMap<string, number> = new Map([
  ["Kangaroos", 3],
  ["Emus", 4],
  ["Wombats", 5],
  ["Koalas", 7],
  ["Platypuses", 9],
]);

/**
 * Round rule: scores each matching pair of animals. Three-of-a-kind counts
 * as one pair, four-of-a-kind as two pairs. Unknown animals score nothing.
 */
export class AnimalsScorer implements IScoreCategory {
  readonly name = "Animals";

  score(ctx: ScoringContext): CategoryResult {
    const counts = new Map<string, number>();
    for (const card of ctx.cards) {
      if (card.animal !== null) {
        counts.set(card.animal, (counts.get(card.animal) ?? 0) + 1);
      }
    }
    let points = 0;
    for (const [animal, count] of counts) {
      points += Math.floor(count / 2) * (ANIMAL_VALUES.get(animal) ?? 0);
    }
    return { name: this.name, points };
  }
}
