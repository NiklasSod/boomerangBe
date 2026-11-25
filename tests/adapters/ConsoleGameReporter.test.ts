import { test } from "node:test";
import assert from "node:assert/strict";
import { ConsoleGameReporter } from "../../src/adapters/ConsoleGameReporter.js";
import { Card } from "../../src/domain/Card.js";
import { Player } from "../../src/domain/Player.js";
import type { IMessageChannel } from "../../src/domain/ports.js";
import type { GameEndContext } from "../../src/application/GameEngine.js";
import type { PlayerRoundReport } from "../../src/application/RoundManager.js";

class FakeChannel implements IMessageChannel {
  readonly sent: string[] = [];

  async send(message: unknown): Promise<void> {
    this.sent.push(String(message));
  }

  read(): Promise<string> {
    return Promise.resolve("");
  }

  close(): void {}
}

function card(letter: string, region = "Western Australia"): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region,
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

test("onRoundStart prints the round number", async () => {
  const channel = new FakeChannel();
  const reporter = new ConsoleGameReporter(channel, 0);

  await reporter.onRoundStart(2);

  assert.deepEqual(channel.sent, ["Round 2"]);
});

test("onRoundEnd prints category detail, region bonus, and round total", async () => {
  const channel = new FakeChannel();
  const reporter = new ConsoleGameReporter(channel, 0);
  const report: PlayerRoundReport = {
    playerId: 0,
    total: 22,
    results: [
      { name: "Throw and Catch", points: 3 },
      {
        name: "Collections",
        points: 12,
        breakdown: new Map([
          ["Leaves", 3],
          ["Shells", 1],
        ]),
      },
      {
        name: "Animals",
        points: 3,
        breakdown: new Map([["Kangaroos", 1]]),
      },
      { name: "Activities", points: 4, scoredActivity: "Swimming" },
    ],
    regionBonuses: ["Western Australia"],
  };

  await reporter.onRoundEnd(1, [report]);

  assert.deepEqual(channel.sent, [
    [
      "Round 1 results:",
      "  Throw and Catch: 3",
      "  Collections: 12 (Leaves x3, Shells x1)",
      "  Animals: 3 (Kangaroos x1 pair)",
      "  Activities: 4 (Swimming)",
      "  Region bonus: +3 (Western Australia)",
      "  Round total: 25",
    ].join("\n"),
  ]);
});

test("onRoundEnd ignores other players", async () => {
  const channel = new FakeChannel();
  const reporter = new ConsoleGameReporter(channel, 0);
  const report: PlayerRoundReport = {
    playerId: 1,
    total: 5,
    results: [{ name: "Throw and Catch", points: 5 }],
    regionBonuses: [],
  };

  await reporter.onRoundEnd(1, [report]);

  assert.deepEqual(channel.sent, []);
});

test("onGameEnd prints sites visited and regions completed", async () => {
  const channel = new FakeChannel();
  const reporter = new ConsoleGameReporter(channel, 0);

  const human = new Player(0);
  human.recordRoundScore(20);
  human.awardRegionBonus("Western Australia");
  human.recordFinalScore(3);
  const bot = new Player(1);
  bot.recordRoundScore(10);

  const context: GameEndContext = {
    players: [human, bot],
    result: { winnerId: 0, totals: new Map([[0, 26], [1, 10]]) },
    collectedCards: new Map([
      [0, [card("A"), card("B"), card("A"), card("C")]],
    ]),
  };

  await reporter.onGameEnd(context);

  const message = channel.sent[0];
  assert.ok(message.includes("Final scores:"));
  assert.ok(message.includes("Player 0: 26"));
  assert.ok(message.includes("Player 1: 10"));
  assert.ok(message.includes("Winner: Player 0"));
  assert.ok(message.includes("Sites visited: 3"));
  assert.ok(message.includes("Regions completed: 1"));
  assert.ok(message.includes("Completed regions: Western Australia"));
  assert.ok(message.includes("Final total: 26"));
});
