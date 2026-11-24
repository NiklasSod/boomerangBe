import type { Player } from "../domain/Player.js";
import type { IAgent } from "../domain/ports.js";
import type { RegionTracker } from "../domain/RegionTracker.js";
import type { ScoreCalculator } from "../domain/ScoreCalculator.js";
import type { CategoryResult } from "../domain/Scoring.js";
import type { DraftCoordinator } from "./DraftCoordinator.js";

/** Chooses which activity a player scores this round (or none). */
export interface ActivityChooser {
  chooseActivity(
    player: Player,
    alreadyScored: ReadonlySet<string>,
  ): Promise<string | undefined>;
}

export interface PlayerRoundReport {
  readonly playerId: number;
  readonly total: number;
  readonly results: readonly CategoryResult[];
}

/**
 * Orchestrates one round: draft, record sites, award region bonuses, score.
 * The per-player "already scored activities" set lives here so the same
 * activity cannot be scored twice across rounds.
 */
export class RoundManager {
  private readonly activitiesAlreadyScored = new Map<number, Set<string>>();

  constructor(
    private readonly draftCoordinator: DraftCoordinator,
    private readonly scoreCalculator: ScoreCalculator,
    private readonly regionTracker: RegionTracker,
    private readonly regions: readonly string[],
    private readonly activityChooser: ActivityChooser,
  ) {}

  async runRound(
    players: readonly Player[],
    agents: readonly IAgent[],
    roundNumber: number,
  ): Promise<readonly PlayerRoundReport[]> {
    await this.draftCoordinator.runRound(players, agents, roundNumber);

    for (const player of players) {
      this.regionTracker.recordSites(player.id, player.draft);
    }

    const playerById = new Map(players.map((player) => [player.id, player]));
    const bonuses = this.regionTracker.awardRoundBonuses(
      this.regions,
      players.map((player) => player.id),
    );
    for (const bonus of bonuses) {
      playerById.get(bonus.playerId)?.awardRegionBonus(bonus.region);
    }

    return Promise.all(
      players.map(async (player) => {
        const alreadyScored =
          this.activitiesAlreadyScored.get(player.id) ?? new Set<string>();
        const chosenActivity = await this.activityChooser.chooseActivity(
          player,
          alreadyScored,
        );
        const report = this.scoreCalculator.scoreRound({
          cards: player.draft,
          activitiesAlreadyScored: alreadyScored,
          chosenActivity,
        });
        player.recordRoundScore(report.total);
        if (chosenActivity !== undefined) {
          alreadyScored.add(chosenActivity);
        }
        this.activitiesAlreadyScored.set(player.id, alreadyScored);
        return {
          playerId: player.id,
          total: report.total,
          results: report.results,
        };
      }),
    );
  }
}
