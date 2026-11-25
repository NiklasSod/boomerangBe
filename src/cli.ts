import { JsonCardSource } from "./adapters/JsonCardSource.js";
import { ConsoleChannel } from "./adapters/ConsoleChannel.js";
import { HumanAgent } from "./adapters/HumanAgent.js";
import { RandomBotAgent } from "./adapters/RandomBotAgent.js";
import { createRandom } from "./adapters/createRandom.js";
import { DraftCoordinator } from "./application/DraftCoordinator.js";
import { RoundManager } from "./application/RoundManager.js";
import { GameEngine } from "./application/GameEngine.js";
import { createScoreCalculator } from "./rules/createScoreCalculator.js";
import { createActivityChooser } from "./application/createActivityChooser.js";
import { ConsoleGameReporter } from "./adapters/ConsoleGameReporter.js";
import { Player } from "./domain/Player.js";
import { RegionTracker } from "./domain/RegionTracker.js";
import type { IAgent } from "./domain/ports.js";

const USAGE = `Usage:
  npm start -- <numPlayers> <numBots> [seed]   start a game (local human + bots + remote humans)
  npm start -- <IP>                            connect as a remote client`;

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
    createActivityChooser(new Map([[0, channel]])),
  );
  const engine = new GameEngine(
    cards,
    players,
    agents,
    roundManager,
    scoreCalculator,
    rng,
  );

  await engine.play(new ConsoleGameReporter(channel, 0));

  channel.close();
}
