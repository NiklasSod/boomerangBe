import { JsonCardSource } from "./adapters/JsonCardSource.js";
import { ConsoleChannel } from "./adapters/ConsoleChannel.js";
import { HumanAgent } from "./adapters/HumanAgent.js";
import { RandomBotAgent } from "./adapters/RandomBotAgent.js";
import { createRandom } from "./adapters/createRandom.js";
import { DraftCoordinator } from "./application/DraftCoordinator.js";
import {
  RoundManager,
  type ActivityChooser,
} from "./application/RoundManager.js";
import { GameEngine } from "./application/GameEngine.js";
import { createScoreCalculator } from "./rules/createScoreCalculator.js";
import { ACTIVITY_SCORES } from "./rules/ActivitiesScorer.js";
import { Player } from "./domain/Player.js";
import { RegionTracker } from "./domain/RegionTracker.js";
import type { Card } from "./domain/Card.js";
import type { IAgent } from "./domain/ports.js";

const USAGE = `Usage:
  npm start -- <numPlayers> <numBots> [seed]   start a game (1 local human + bots)
  npm start -- <IP>                            connect as a client (arrives in step 20)`;

export type CliArgs =
  | {
      readonly mode: "server";
      readonly numPlayers: number;
      readonly numBots: number;
      readonly seed?: number;
    }
  | { readonly mode: "client"; readonly ip: string }
  | { readonly mode: "help"; readonly message: string };

/** Parses the CLI arguments (without node/script). */
export function parseCliArgs(args: readonly string[]): CliArgs {
  if (args.length === 1) {
    return { mode: "client", ip: args[0] };
  }
  if (args.length === 2 || args.length === 3) {
    const numPlayers = Number(args[0]);
    const numBots = Number(args[1]);
    const seed = args[2] === undefined ? undefined : Number(args[2]);
    const total = numPlayers + numBots;
    if (
      Number.isInteger(numPlayers) &&
      numPlayers >= 1 &&
      Number.isInteger(numBots) &&
      numBots >= 0 &&
      (seed === undefined || Number.isInteger(seed)) &&
      total >= 2 &&
      total <= 4
    ) {
      return { mode: "server", numPlayers, numBots, seed };
    }
    return { mode: "help", message: `Invalid server arguments. ${USAGE}` };
  }
  return { mode: "help", message: USAGE };
}

/**
 * Runs a local game with one console human plus bots. Remote clients are
 * added in step 20, so numPlayers must currently be 1.
 */
export async function runLocalGame(
  numPlayers: number,
  numBots: number,
  seed?: number,
): Promise<void> {
  if (numPlayers !== 1) {
    throw new Error(
      "Only one local human is supported until remote clients arrive in step 20.",
    );
  }

  const cards = await new JsonCardSource(
    new URL("./cards/australia/cards.json", import.meta.url),
  ).load();

  const channel = new ConsoleChannel();
  const rng = createRandom(seed);

  const players = [new Player(0)];
  const agents: IAgent[] = [new HumanAgent(channel)];
  for (let i = 0; i < numBots; i++) {
    players.push(new Player(i + 1));
    agents.push(new RandomBotAgent(rng));
  }

  const regions = [...new Set(cards.map((card) => card.region))];
  const scoreCalculator = createScoreCalculator();
  const roundManager = new RoundManager(
    new DraftCoordinator(),
    scoreCalculator,
    new RegionTracker(),
    regions,
    makeActivityChooser(channel),
  );
  const engine = new GameEngine(
    cards,
    players,
    agents,
    roundManager,
    scoreCalculator,
    rng,
  );

  const result = await engine.play();

  await channel.send("Final scores:");
  for (const player of players) {
    await channel.send(`Player ${player.id}: ${player.totalScore}`);
  }
  await channel.send(`Winner: Player ${result.winnerId}`);
  channel.close();
}

function makeActivityChooser(channel: ConsoleChannel): ActivityChooser {
  return {
    async chooseActivity(player, alreadyScored) {
      const available = availableActivities(player.draft, alreadyScored);
      if (available.length === 0) {
        return undefined;
      }
      if (player.id !== 0) {
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

function availableActivities(
  draft: readonly Card[],
  alreadyScored: ReadonlySet<string>,
): { name: string; count: number; points: number }[] {
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
