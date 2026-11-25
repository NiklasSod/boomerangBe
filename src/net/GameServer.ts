import type { Socket } from "socket.io";
import { createServer } from "../server.js";
import { JsonCardSource } from "../adapters/JsonCardSource.js";
import { ConsoleChannel } from "../adapters/ConsoleChannel.js";
import { HumanAgent } from "../adapters/HumanAgent.js";
import { RandomBotAgent } from "../adapters/RandomBotAgent.js";
import { createRandom } from "../adapters/createRandom.js";
import { Player } from "../domain/Player.js";
import { RegionTracker } from "../domain/RegionTracker.js";
import { DraftCoordinator } from "../application/DraftCoordinator.js";
import { RoundManager } from "../application/RoundManager.js";
import { GameEngine } from "../application/GameEngine.js";
import { createScoreCalculator } from "../rules/createScoreCalculator.js";
import { createActivityChooser } from "../application/createActivityChooser.js";
import { ConsoleGameReporter } from "../adapters/ConsoleGameReporter.js";
import { HumanPickNotifier } from "../adapters/HumanPickNotifier.js";
import { SocketChannel } from "./SocketChannel.js";
import type { IAgent, IMessageChannel } from "../domain/ports.js";

export interface GameServerOptions {
  readonly port: number;
  readonly numPlayers: number;
  readonly numBots: number;
  readonly seed?: number;
}

/**
 * Hosts a game: one local human on the console, remote humans over
 * Socket.IO, and random bots filling the remaining seats.
 */
export async function startGameServer(
  options: GameServerOptions,
): Promise<void> {
  const { port, numPlayers, numBots, seed } = options;
  const remoteHumans = numPlayers - 1;

  const cards = await new JsonCardSource(
    new URL("../cards/australia/cards.json", import.meta.url),
  ).load();
  const regions = [...new Set(cards.map((card) => card.region))];

  const { httpServer, io } = createServer();

  const humanChannels = new Map<number, IMessageChannel>();
  const consoleChannel = new ConsoleChannel();
  humanChannels.set(0, consoleChannel);

  const remoteSockets: Socket[] = [];
  const allConnected = new Promise<void>((resolve) => {
    if (remoteHumans === 0) {
      resolve();
      return;
    }
    io.on("connection", (socket) => {
      remoteSockets.push(socket);
      console.log(
        `[server] remote player ${remoteSockets.length}/${remoteHumans} connected`,
      );
      if (remoteSockets.length >= remoteHumans) {
        resolve();
      }
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      console.log(
        `[server] listening on http://localhost:${port} — waiting for ${remoteHumans} remote player(s)`,
      );
      resolve();
    });
  });

  await allConnected;

  const players = [new Player(0)];
  const agents: IAgent[] = [new HumanAgent(consoleChannel)];
  for (let i = 0; i < remoteHumans; i++) {
    const playerId = i + 1;
    const channel = new SocketChannel(remoteSockets[i]);
    humanChannels.set(playerId, channel);
    players.push(new Player(playerId));
    agents.push(new HumanAgent(channel));
  }

  const rng = createRandom(seed);
  for (let i = 0; i < numBots; i++) {
    const playerId = numPlayers + i;
    players.push(new Player(playerId));
    agents.push(new RandomBotAgent(rng));
  }

  const scoreCalculator = createScoreCalculator();
  const roundManager = new RoundManager(
    new DraftCoordinator({
      pickObserver: new HumanPickNotifier(humanChannels),
    }),
    scoreCalculator,
    new RegionTracker(),
    regions,
    createActivityChooser(humanChannels),
  );
  const engine = new GameEngine(
    cards,
    players,
    agents,
    roundManager,
    scoreCalculator,
    rng,
  );

  const result = await engine.play(new ConsoleGameReporter(consoleChannel, 0));

  const summary = [
    "Final scores:",
    ...players.map((player) => `Player ${player.id}: ${player.totalScore}`),
    `Winner: Player ${result.winnerId}`,
  ].join("\n");
  for (const [playerId, channel] of humanChannels) {
    if (playerId === 0) {
      continue; // the console host already received a full report
    }
    await channel.send(summary);
  }

  for (const socket of remoteSockets) {
    socket.disconnect(true);
  }
  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
  consoleChannel.close();
}
