import type { Card } from "./Card.js";

/** Output of one scoring rule. */
export interface CategoryResult {
  readonly name: string;
  readonly points: number;
  /** Activity scored this round, if any (used by Activities). */
  readonly scoredActivity?: string;
}

/**
 * Immutable snapshot of everything a scoring rule needs. For per-round rules
 * `cards` is this round's draft; for the final site rule it is every card
 * collected across the game.
 */
export interface ScoringContext {
  readonly cards: readonly Card[];
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
