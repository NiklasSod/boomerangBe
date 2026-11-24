import { ScoreCalculator } from "../domain/ScoreCalculator.js";
import { ThrowAndCatchScorer } from "./ThrowAndCatchScorer.js";
import { CollectionsScorer } from "./CollectionsScorer.js";
import { AnimalsScorer } from "./AnimalsScorer.js";
import { ActivitiesScorer } from "./ActivitiesScorer.js";
import { SitesScorer } from "./SitesScorer.js";

/**
 * Composition root for Boomerang Australia scoring. Round rules run every
 * round; final rules run once after round 4. Region bonuses are not a card
 * category — they are handled by RegionTracker during orchestration.
 */
export function createScoreCalculator(): ScoreCalculator {
  return new ScoreCalculator(
    [
      new ThrowAndCatchScorer(),
      new CollectionsScorer(),
      new AnimalsScorer(),
      new ActivitiesScorer(),
    ],
    [new SitesScorer()],
  );
}
