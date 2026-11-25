import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

/** Points for 1..6 activity cards, indexed by count - 1. */
export const ACTIVITY_SCORES: readonly number[] = [0, 2, 4, 7, 10, 15];

/**
 * Round rule: scores the single activity the player chose this round.
 * Which activity to offer is decided by orchestration, not this rule, so
 * the rule stays pure and simply reads `chosenActivity` from the context.
 */
export class ActivitiesScorer implements IScoreCategory {
  readonly name = "Activities";

  score(ctx: ScoringContext): CategoryResult {
    const { cards, chosenActivity, activitiesAlreadyScored } = ctx;
    if (chosenActivity === undefined || activitiesAlreadyScored.has(chosenActivity)) {
      return { name: this.name, points: 0 };
    }
    const count = cards.reduce(
      (sum, card) => sum + (card.activity === chosenActivity ? 1 : 0),
      0,
    );
    if (count === 0) {
      return { name: this.name, points: 0 };
    }
    const index = Math.min(count, ACTIVITY_SCORES.length) - 1;
    return {
      name: this.name,
      points: ACTIVITY_SCORES[index],
      scoredActivity: chosenActivity,
    };
  }
}
