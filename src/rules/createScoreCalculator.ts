import { ScoreCalculator } from "../domain/ScoreCalculator.js";
import { ThrowAndCatchScorer } from "./ThrowAndCatchScorer.js";
import { CollectionsScorer } from "./CollectionsScorer.js";
import { AnimalsScorer } from "./AnimalsScorer.js";
import { ActivitiesScorer } from "./ActivitiesScorer.js";
import { SitesScorer } from "./SitesScorer.js";

/** Card-set-specific values needed by the scoring rules. */
export interface ScoreConfig {
  readonly collectionValues: ReadonlyMap<string, number>;
  readonly animalValues: ReadonlyMap<string, number>;
}

/**
 * Composition root for scoring. Round rules run every round; final rules run
 * once after round 4. Region bonuses are not a card category — they are
 * handled by RegionTracker during orchestration. The value tables are
 * injected so the same rules work for any card set.
 */
export function createScoreCalculator(config: ScoreConfig): ScoreCalculator {
  return new ScoreCalculator(
    [
      new ThrowAndCatchScorer(),
      new CollectionsScorer(config.collectionValues),
      new AnimalsScorer(config.animalValues),
      new ActivitiesScorer(),
    ],
    [new SitesScorer()],
  );
}
