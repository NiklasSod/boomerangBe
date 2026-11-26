import type { Card } from "../domain/Card.js";
import type { Player } from "../domain/Player.js";
import type { IMessageChannel } from "../domain/ports.js";
import type { ActivityChooser } from "./RoundManager.js";
import { ACTIVITY_SCORES } from "../rules/ActivitiesScorer.js";

export interface ActivityOption {
  readonly name: string;
  readonly count: number;
  readonly points: number;
}

/** Activities in the draft that have not been scored yet. */
export function availableActivities(
  draft: readonly Card[],
  alreadyScored: ReadonlySet<string>,
): ActivityOption[] {
  const counts = new Map<string, number>();
  for (const card of draft) {
    if (card.activity !== null && !alreadyScored.has(card.activity)) {
      counts.set(card.activity, (counts.get(card.activity) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([name, count]) => ({
    name,
    count,
    points: ACTIVITY_SCORES[Math.min(count, ACTIVITY_SCORES.length) - 1] ?? 0,
  }));
}

/**
 * Activity chooser for the full game. Humans (ids present in humanChannels)
 * are prompted over their channel; bots pick the first available activity.
 */
export function createActivityChooser(
  humanChannels: ReadonlyMap<number, IMessageChannel>,
): ActivityChooser {
  return {
    async chooseActivity(player, alreadyScored) {
      const channel = humanChannels.get(player.id);
      if (channel !== undefined) {
        await announceCatchCard(channel, player);
      }
      const available = availableActivities(player.draft, alreadyScored);
      if (available.length === 0) {
        return undefined;
      }
      if (channel === undefined) {
        return available[0].name;
      }

      const listing = available
        .map((a) => `${a.name} (x${a.count}, ${a.points} pts)`)
        .join(", ");
      await channel.send(`Available activities: ${listing}`);
      await channel.send("Type an activity name to score it, or 'none' to skip");
      for (;;) {
        const answer = (await channel.read()).trim();
        if (answer.toLowerCase() === "none") {
          return undefined;
        }
        const match = available.find(
          (a) => a.name.toLowerCase() === answer.toLowerCase(),
        );
        if (match !== undefined) {
          return match.name;
        }
        await channel.send(`"${answer}" is not available. Try again.`);
      }
    },
  };
}

async function announceCatchCard(
  channel: IMessageChannel,
  player: Player,
): Promise<void> {
  const draft = player.draft;
  if (draft.length === 0) {
    return;
  }
  const catchCard = draft[draft.length - 1];
  await channel.send(
    `Your catch card: ${catchCard.name} [${catchCard.siteLetter}] (${catchCard.number})`,
  );
}
