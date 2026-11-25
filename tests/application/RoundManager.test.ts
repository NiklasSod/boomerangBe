import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RoundManager,
  type ActivityChooser,
} from "../../src/application/RoundManager.js";
import { DraftCoordinator } from "../../src/application/DraftCoordinator.js";
import { createScoreCalculator } from "../../src/rules/createScoreCalculator.js";
import { RegionTracker } from "../../src/domain/RegionTracker.js";
import { Card } from "../../src/domain/Card.js";
import { Player } from "../../src/domain/Player.js";
import type { IAgent } from "../../src/domain/ports.js";

interface CardOptions {
  number?: number;
  region?: string;
  collection?: string | null;
  animal?: string | null;
  activity?: string | null;
}

function makeCard(letter: string, options: CardOptions = {}): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: options.region ?? "WA",
    collection_id: options.number ?? 1,
    collection_type: options.collection ?? null,
    animal: options.animal ?? null,
    activity: options.activity ?? null,
  });
}

function playersWith(cards0: Card[], cards1: Card[]): Player[] {
  const player0 = new Player(0);
  player0.setHand(cards0);
  const player1 = new Player(1);
  player1.setHand(cards1);
  return [player0, player1];
}

const firstCardAgent: IAgent = {
  async chooseCard(hand: Card[]): Promise<Card> {
    return hand[0];
  },
};

const noActivity: ActivityChooser = {
  async chooseActivity() {
    return undefined;
  },
};

test("drafts, records sites, and records a round score per player", async () => {
  const numbers: Record<string, number> = { A: 1, G: 6, H: 2, N: 3 };
  const players = playersWith(
    ["A", "B", "C", "D", "E", "F", "G"].map((l) =>
      makeCard(l, { number: numbers[l] ?? 1 }),
    ),
    ["H", "I", "J", "K", "L", "M", "N"].map((l) =>
      makeCard(l, { number: numbers[l] ?? 1 }),
    ),
  );
  const regionTracker = new RegionTracker();
  const manager = new RoundManager(
    new DraftCoordinator(),
    createScoreCalculator(),
    regionTracker,
    [],
    noActivity,
  );

  await manager.runRound(players, [firstCardAgent, firstCardAgent], 1);

  assert.deepEqual(
    players[0].draft.map((c) => c.siteLetter),
    ["A", "I", "C", "K", "E", "M", "G"],
  );
  assert.deepEqual(
    players[1].draft.map((c) => c.siteLetter),
    ["H", "B", "J", "D", "L", "F", "N"],
  );
  assert.deepEqual(players[0].roundScores, [5]); // |1 - 6|
  assert.deepEqual(players[1].roundScores, [1]); // |2 - 3|
});

test("awards +3 to every player completing the same region in a round", async () => {
  const waLetters = new Set(["A", "C", "E", "G", "H", "B", "J", "D"]);
  const players = playersWith(
    ["A", "B", "C", "D", "E", "F", "G"].map((l) =>
      makeCard(l, { region: waLetters.has(l) ? "WA" : "NT" }),
    ),
    ["H", "I", "J", "K", "L", "M", "N"].map((l) =>
      makeCard(l, { region: waLetters.has(l) ? "WA" : "NT" }),
    ),
  );
  const regionTracker = new RegionTracker();
  const manager = new RoundManager(
    new DraftCoordinator(),
    createScoreCalculator(),
    regionTracker,
    ["WA"],
    noActivity,
  );

  await manager.runRound(players, [firstCardAgent, firstCardAgent], 1);

  assert.deepEqual(players[0].regionBonuses, ["WA"]);
  assert.deepEqual(players[1].regionBonuses, ["WA"]);
  assert.equal(regionTracker.claimed.has("WA"), true);
});

test("reports the region bonus awarded to each player this round", async () => {
  const waLetters = new Set(["A", "C", "E", "G", "H", "B", "J", "D"]);
  const players = playersWith(
    ["A", "B", "C", "D", "E", "F", "G"].map((l) =>
      makeCard(l, { region: waLetters.has(l) ? "WA" : "NT" }),
    ),
    ["H", "I", "J", "K", "L", "M", "N"].map((l) =>
      makeCard(l, { region: waLetters.has(l) ? "WA" : "NT" }),
    ),
  );
  const manager = new RoundManager(
    new DraftCoordinator(),
    createScoreCalculator(),
    new RegionTracker(),
    ["WA"],
    noActivity,
  );

  const reports = await manager.runRound(
    players,
    [firstCardAgent, firstCardAgent],
    1,
  );

  assert.deepEqual(reports[0].regionBonuses, ["WA"]);
  assert.deepEqual(reports[1].regionBonuses, ["WA"]);
});

test("scores the chosen activity and remembers it as used", async () => {
  const swimmingLetters = new Set(["A", "I", "C"]);
  const players = playersWith(
    ["A", "B", "C", "D", "E", "F", "G"].map((l) =>
      makeCard(l, { activity: swimmingLetters.has(l) ? "Swimming" : null }),
    ),
    ["H", "I", "J", "K", "L", "M", "N"].map((l) =>
      makeCard(l, { activity: swimmingLetters.has(l) ? "Swimming" : null }),
    ),
  );
  const seenSets: ReadonlySet<string>[] = [];
  const chooser: ActivityChooser = {
    async chooseActivity(player, alreadyScored) {
      seenSets[player.id] = alreadyScored;
      return player.id === 0 ? "Swimming" : undefined;
    },
  };
  const manager = new RoundManager(
    new DraftCoordinator(),
    createScoreCalculator(),
    new RegionTracker(),
    [],
    chooser,
  );

  await manager.runRound(players, [firstCardAgent, firstCardAgent], 1);

  assert.equal(players[0].roundScores[0], 4); // 3 Swimming cards
  assert.equal(players[1].roundScores[0], 0);
  assert.equal(seenSets[0].has("Swimming"), true);
});
