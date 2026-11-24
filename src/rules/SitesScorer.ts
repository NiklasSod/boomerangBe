import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../domain/Scoring.js";

/**
 * Final (end-of-game) rule: 1 point per unique site collected across all
 * rounds. A site is identified by its site letter.
 */
export class SitesScorer implements IScoreCategory {
  readonly name = "Sites";

  score(ctx: ScoringContext): CategoryResult {
    const uniqueSites = new Set(ctx.cards.map((card) => card.siteLetter));
    return { name: this.name, points: uniqueSites.size };
  }
}
