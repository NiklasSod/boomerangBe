import { test } from "node:test";
import assert from "node:assert/strict";
import { DraftCoordinator } from "../../src/application/DraftCoordinator.js";
import { Card } from "../../src/domain/Card.js";
import { Player } from "../../src/domain/Player.js";
import type { CardPickPurpose, IAgent } from "../../src/domain/ports.js";

const THREE_HANDS = [
  ["A", "B", "C", "D", "E", "F", "G"],
  ["H", "I", "J", "K", "L", "M", "N"],
  ["O", "P", "Q", "R", "S", "T", "U"],
];

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

function makePlayers(handLetters: string[][]): Player[] {
  return handLetters.map((letters, id) => {
    const player = new Player(id);
    player.setHand(letters.map(makeCard));
    return player;
  });
}

function letters(player: Player): string[] {
  return player.draft.map((card) => card.siteLetter);
}

const firstCardAgent: IAgent = {
  async chooseCard(hand: Card[]): Promise<Card> {
    return hand[0];
  },
};

test("drafts 7 cards per player with a first-card agent", async () => {
  const players = makePlayers([
    ["A", "B", "C", "D", "E", "F", "G"],
    ["H", "I", "J", "K", "L", "M", "N"],
  ]);
  const coordinator = new DraftCoordinator();

  await coordinator.runRound(players, [firstCardAgent, firstCardAgent], 1);

  assert.deepEqual(letters(players[0]), ["A", "I", "C", "K", "E", "M", "G"]);
  assert.deepEqual(letters(players[1]), ["H", "B", "J", "D", "L", "F", "N"]);
  assert.equal(players[0].hand.length, 0);
  assert.equal(players[1].hand.length, 0);
});

test("catch card travels opposite by default and same when disabled", async () => {
  const opposite = new DraftCoordinator();
  const oppositePlayers = makePlayers(THREE_HANDS);
  await opposite.runRound(
    oppositePlayers,
    [firstCardAgent, firstCardAgent, firstCardAgent],
    1,
  );

  const same = new DraftCoordinator({ catchOppositeDirection: false });
  const samePlayers = makePlayers(THREE_HANDS);
  await same.runRound(
    samePlayers,
    [firstCardAgent, firstCardAgent, firstCardAgent],
    1,
  );

  assert.deepEqual(letters(oppositePlayers[0]), ["A", "P", "J", "D", "S", "M", "U"]);
  assert.deepEqual(letters(oppositePlayers[1]), ["H", "B", "Q", "K", "E", "T", "G"]);
  assert.deepEqual(letters(oppositePlayers[2]), ["O", "I", "C", "R", "L", "F", "N"]);

  assert.deepEqual(letters(samePlayers[0]), ["A", "P", "J", "D", "S", "M", "G"]);
  assert.deepEqual(letters(samePlayers[1]), ["H", "B", "Q", "K", "E", "T", "N"]);
  assert.deepEqual(letters(samePlayers[2]), ["O", "I", "C", "R", "L", "F", "U"]);
});

test("passes anticlockwise when clockwise is false", async () => {
  const coordinator = new DraftCoordinator({ clockwise: false });
  const players = makePlayers(THREE_HANDS);

  await coordinator.runRound(
    players,
    [firstCardAgent, firstCardAgent, firstCardAgent],
    1,
  );

  assert.deepEqual(letters(players[0]), ["A", "I", "Q", "D", "L", "T", "N"]);
  assert.deepEqual(letters(players[1]), ["H", "P", "C", "K", "S", "F", "U"]);
  assert.deepEqual(letters(players[2]), ["O", "B", "J", "R", "E", "M", "G"]);
});

test("alternates direction on even rounds", async () => {
  const coordinator = new DraftCoordinator({ alternateEachRound: true });
  const players = makePlayers(THREE_HANDS);

  await coordinator.runRound(
    players,
    [firstCardAgent, firstCardAgent, firstCardAgent],
    2,
  );

  // Round 2 is even, so the base clockwise direction flips to anticlockwise.
  assert.deepEqual(letters(players[0]), ["A", "I", "Q", "D", "L", "T", "N"]);
  assert.deepEqual(letters(players[1]), ["H", "P", "C", "K", "S", "F", "U"]);
  assert.deepEqual(letters(players[2]), ["O", "B", "J", "R", "E", "M", "G"]);
});

test("throws when players and agents do not match", async () => {
  const players = makePlayers([
    ["A", "B", "C", "D", "E", "F", "G"],
    ["H", "I", "J", "K", "L", "M", "N"],
  ]);
  const coordinator = new DraftCoordinator();

  await assert.rejects(
    coordinator.runRound(players, [firstCardAgent], 1),
    /one agent per player/,
  );
});

test("throws for fewer than 2 players", async () => {
  const players = makePlayers([["A", "B", "C", "D", "E", "F", "G"]]);
  const coordinator = new DraftCoordinator();

  await assert.rejects(
    coordinator.runRound(players, [firstCardAgent], 1),
    /between 2 and 4 players/,
  );
});

test("throws when a player does not start with a 7-card hand", async () => {
  const players = makePlayers([
    ["A", "B", "C", "D", "E", "F", "G"],
    ["H", "I", "J", "K", "L", "M", "N"],
  ]);
  players[0].moveToDraft(players[0].hand[0]);
  const coordinator = new DraftCoordinator();

  await assert.rejects(
    coordinator.runRound(players, [firstCardAgent, firstCardAgent], 1),
    /7-card hand and an empty draft/,
  );
});

test("labels the first pick as the throw card", async () => {
  const purposes: CardPickPurpose[] = [];
  const recordingAgent: IAgent = {
    async chooseCard(hand: Card[], purpose?: CardPickPurpose) {
      if (purpose !== undefined) {
        purposes.push(purpose);
      }
      return hand[0];
    },
  };
  const players = makePlayers([
    ["A", "B", "C", "D", "E", "F", "G"],
    ["H", "I", "J", "K", "L", "M", "N"],
  ]);
  const coordinator = new DraftCoordinator();

  await coordinator.runRound(players, [recordingAgent, recordingAgent], 1);

  assert.deepEqual(purposes, [
    "throw",
    "throw",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
    "draft",
  ]);
});
