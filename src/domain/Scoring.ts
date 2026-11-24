import type { Card } from "./Card.js";

/** Output of one scoring rule for one player/round. */
export interface CategoryResult {
  readonly name: string;
  readonly points: number;
  /** Site letters newly recorded this round (used by Tourist Sites). */
  readonly newSites?: readonly string[];
  /** Activity scored this round, if any (used by Activities). */
  readonly scoredActivity?: string;
}

/** Immutable snapshot of everything a scoring rule needs for one round. */
export interface ScoringContext {
  readonly draft: readonly Card[];
  readonly sitesAlreadyScored: ReadonlySet<string>;
  readonly activitiesAlreadyScored: ReadonlySet<string>;
  /** Activity the player opted to score this round, if any. */
  readonly chosenActivity?: string;
}

/**
 * One scoring rule (Strategy).
 * ScoreCalculator depends only on this interface, so new rules plug in
 * without editing any existing code (OCP).
 */
export interface IScoreCategory {
  readonly name: string;
  score(ctx: ScoringContext): CategoryResult;
}
