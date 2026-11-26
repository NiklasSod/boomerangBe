import type { CategoryResult, IScoreCategory, ScoringContext } from "./Scoring.js";

export interface ScoreReport {
  readonly results: readonly CategoryResult[];
  readonly total: number;
}

/**
 * Aggregates scoring rules. Holds per-round categories and final
 * (end-of-game) categories separately; both are IScoreCategory so new rules
 * plug in without changing this class (OCP).
 */
export class ScoreCalculator {
  constructor(
    private readonly roundCategories: readonly IScoreCategory[],
    private readonly finalCategories: readonly IScoreCategory[] = [],
  ) {}

  scoreRound(ctx: ScoringContext): ScoreReport {
    return this.run(this.roundCategories, ctx);
  }

  scoreFinal(ctx: ScoringContext): ScoreReport {
    return this.run(this.finalCategories, ctx);
  }

  private run(
    categories: readonly IScoreCategory[],
    ctx: ScoringContext,
  ): ScoreReport {
    const results = categories.map((category) => category.score(ctx));
    const total = results.reduce((sum, result) => sum + result.points, 0);
    return { results, total };
  }
}
