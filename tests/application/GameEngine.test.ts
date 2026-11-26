import { test } from "node:test";
import assert from "node:assert/strict";
import { GameEngine, determineWinner, composeObservers } from "../../src/application/GameEngine.js";
import type { GameEndContext } from "../../src/application/GameEngine.js";
import { DraftCoordinator } from "../../src/application/DraftCoordinator.js";
import { RoundManager } from "../../src/application/RoundManager.js";
import { createScoreCalculator } from "../../src/rules/createScoreCalculator.js";
import { Card } from "../../src/domain/Card.js";
import { Player } from "../../src/domain/Player.js";
import { RegionTracker } from "../../src/domain/RegionTracker.js";
import type { IAgent, IRandom } from "../../src/domain/ports.js";
import { australiaConfig } from "../../src/cards/australia.js";

const scoreConfig = {
  collectionValues: australiaConfig.collectionValues,
  animalValues: australiaConfig.animalValues,
};

const firstCardAgent: IAgent = {
  async chooseCard(hand: Card[]): Promise<Card> {
    return hand[0];
  },
};

/** Leaves the deck in its original order by always swapping with itself. */
const noShuffle: IRandom = {
  nextInt(upperExclusive: number): number {
    return upperExclusive - 1;
  },
};

function makeCard(letter: string): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: "WA",
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

test("determineWinner picks the highest total score", () => {
  const low = new Player(0);
  low.recordRoundScore(10);
  const high = new Player(1);
  high.recordRoundScore(20);

  const result = determineWinner([low, high], new Map());

  assert.equal(result.winnerId, 1);
  assert.deepEqual(result.totals, new Map([[0, 10], [1, 20]]));
});

test("determineWinner breaks a tie with Throw and Catch points", () => {
  const first = new Player(0);
  first.recordRoundScore(15);
  const second = new Player(1);
  second.recordRoundScore(15);

  const result = determineWinner([first, second], new Map([[0, 8], [1, 12]]));

  assert.equal(result.winnerId, 1);
});

test("determineWinner keeps the first player on a full tie", () => {
  const first = new Player(0);
  first.recordRoundScore(15);
  const second = new Player(1);
  second.recordRoundScore(15);

  const result = determineWinner([first, second], new Map([[0, 5], [1, 5]]));

  assert.equal(result.winnerId, 0);
});

test("play runs four rounds, scores sites, and picks a winner", async () => {
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "*", "-"];
  const cards = letters.map(makeCard);
  const players = [new Player(0), new Player(1)];
  const scoreCalculator = createScoreCalculator(scoreConfig);
  const roundManager = new RoundManager(
    new DraftCoordinator(),
    scoreCalculator,
    new RegionTracker(),
    [],
    { async chooseActivity() { return undefined; } },
  );
  const engine = new GameEngine(
    cards,
    players,
    [firstCardAgent, firstCardAgent],
    roundManager,
    scoreCalculator,
    noShuffle,
  );

  const result = await engine.play();

  assert.deepEqual(players[0].roundScores, [0, 0, 0, 0]);
  assert.deepEqual(players[1].roundScores, [0, 0, 0, 0]);
  assert.equal(players[0].finalScore, 28);
  assert.equal(players[1].finalScore, 28);
  assert.deepEqual(result.totals, new Map([[0, 28], [1, 28]]));
  assert.equal(result.winnerId, 0);
});

test("composeObservers fans every hook out to each observer", async () => {
  const eventsA: string[] = [];
  const eventsB: string[] = [];
  const composed = composeObservers([
    {
      onRoundStart(round) {
        eventsA.push(`start${round}`);
      },
      onRoundEnd(round) {
        eventsA.push(`end${round}`);
      },
      onGameEnd() {
        eventsA.push("game");
      },
    },
    {
      onRoundStart(round) {
        eventsB.push(`start${round}`);
      },
      onRoundEnd(round) {
        eventsB.push(`end${round}`);
      },
      onGameEnd() {
        eventsB.push("game");
      },
    },
  ]);

  const context: GameEndContext = {
    players: [],
    result: { winnerId: 0, totals: new Map() },
    collectedCards: new Map(),
  };
  await composed.onRoundStart?.(1);
  await composed.onRoundEnd?.(1, []);
  await composed.onGameEnd?.(context);

  assert.deepEqual(eventsA, ["start1", "end1", "game"]);
  assert.deepEqual(eventsB, ["start1", "end1", "game"]);
});
