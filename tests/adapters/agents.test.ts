import { test } from "node:test";
import assert from "node:assert/strict";
import { Card } from "../../src/domain/Card.js";
import type { IMessageChannel } from "../../src/domain/ports.js";
import { HumanAgent } from "../../src/adapters/HumanAgent.js";
import { RandomBotAgent } from "../../src/adapters/RandomBotAgent.js";
import { SeededRandom } from "../../src/adapters/SeededRandom.js";

function card(letter: string): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: "Test Region",
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

class FakeChannel implements IMessageChannel {
  readonly sent: string[] = [];
  private readonly reads: string[];
  private index = 0;

  constructor(reads: string[]) {
    this.reads = reads;
  }

  async send(message: unknown): Promise<void> {
    this.sent.push(String(message));
  }

  async read(): Promise<string> {
    return this.reads[this.index++];
  }
}

test("HumanAgent returns the card matching the typed letter", async () => {
  const hand = [card("A"), card("B"), card("C")];
  const agent = new HumanAgent(new FakeChannel(["b"]));

  const chosen = await agent.chooseCard(hand);

  assert.equal(chosen.siteLetter, "B");
});

test("HumanAgent retries until a valid letter is given", async () => {
  const hand = [card("A"), card("B")];
  const channel = new FakeChannel(["z", "a"]);
  const agent = new HumanAgent(channel);

  const chosen = await agent.chooseCard(hand);

  assert.equal(chosen.siteLetter, "A");
  assert.ok(channel.sent.some((m) => m.includes("not in your hand")));
});

test("RandomBotAgent picks a card from the hand", async () => {
  const hand = [card("A"), card("B"), card("C")];
  const agent = new RandomBotAgent(new SeededRandom(1));

  const chosen = await agent.chooseCard(hand);

  assert.ok(hand.some((c) => c.siteLetter === chosen.siteLetter));
});

test("RandomBotAgent is deterministic for the same seed", async () => {
  const hand = [card("A"), card("B"), card("C")];
  const a = new RandomBotAgent(new SeededRandom(7));
  const b = new RandomBotAgent(new SeededRandom(7));

  assert.equal((await a.chooseCard(hand)).siteLetter, (await b.chooseCard(hand)).siteLetter);
});

test("RandomBotAgent throws when the hand is empty", async () => {
  const agent = new RandomBotAgent(new SeededRandom(1));

  await assert.rejects(() => agent.chooseCard([]), /empty hand/);
});
