import type { IMessageChannel } from "../domain/ports.js";
import type { CategoryResult } from "../domain/Scoring.js";
import type { GameEndContext, GameObserver } from "../application/GameEngine.js";
import type { PlayerRoundReport } from "../application/RoundManager.js";

function formatCategory(result: CategoryResult): string {
  let line = `${result.name}: ${result.points}`;
  const details: string[] = [];

  if (result.breakdown !== undefined) {
    for (const [item, count] of result.breakdown) {
      const unit =
        result.name === "Animals" ? ` ${count === 1 ? "pair" : "pairs"}` : "";
      details.push(`${item} x${count}${unit}`);
    }
  } else if (result.scoredActivity !== undefined) {
    details.push(result.scoredActivity);
  }

  if (details.length > 0) {
    line += ` (${details.join(", ")})`;
  }
  return line;
}

/** Writes round-by-round and final scoring for one human to their channel. */
export class ConsoleGameReporter implements GameObserver {
  constructor(
    private readonly channel: IMessageChannel,
    private readonly playerId: number,
  ) {}

  async onRoundStart(round: number): Promise<void> {
    await this.channel.send(`Round ${round}`);
  }

  async onRoundEnd(
    round: number,
    reports: readonly PlayerRoundReport[],
  ): Promise<void> {
    const report = reports.find((r) => r.playerId === this.playerId);
    if (report === undefined) {
      return;
    }

    const lines = [`Round ${round} results:`];
    for (const result of report.results) {
      lines.push(`  ${formatCategory(result)}`);
    }
    for (const region of report.regionBonuses) {
      lines.push(`  Region bonus: +3 (${region})`);
    }
    lines.push(`  Round total: ${report.total + report.regionBonuses.length * 3}`);
    await this.channel.send(lines.join("\n"));
  }

  async onGameEnd(context: GameEndContext): Promise<void> {
    const player = context.players.find((p) => p.id === this.playerId);
    if (player === undefined) {
      return;
    }
    const cards = context.collectedCards.get(this.playerId) ?? [];
    const sitesVisited = new Set(cards.map((card) => card.siteLetter)).size;

    const lines = [
      "Final scores:",
      ...context.players.map((p) => `  Player ${p.id}: ${p.totalScore}`),
      `Winner: Player ${context.result.winnerId}`,
      "",
      "Your game summary:",
      `  Sites visited: ${sitesVisited}`,
      `  Regions completed: ${player.regionBonuses.length}`,
    ];
    if (player.regionBonuses.length > 0) {
      lines.push(`  Completed regions: ${player.regionBonuses.join(", ")}`);
    }
    lines.push(`  Final total: ${player.totalScore}`);
    await this.channel.send(lines.join("\n"));
  }
}
