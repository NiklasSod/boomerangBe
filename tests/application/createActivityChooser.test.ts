import { test } from "node:test";
import assert from "node:assert/strict";
import { createActivityChooser } from "../../src/application/createActivityChooser.js";
import { Card } from "../../src/domain/Card.js";
import { Player } from "../../src/domain/Player.js";
import type { IMessageChannel } from "../../src/domain/ports.js";

function card(activity: string | null): Card {
  return Card.fromRaw(`Site ${activity ?? "none"}`, {
    site: "a",
    region: "WA",
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity,
  });
}

class FakeChannel implements IMessageChannel {
  readonly sent: string[] = [];
  private index = 0;

  constructor(private readonly answers: string[]) {}

  async send(message: unknown): Promise<void> {
    this.sent.push(String(message));
  }

  async read(): Promise<string> {
    return this.answers[this.index++] ?? "none";
  }

  close(): void {}
}

test("a bot scores the first available activity", async () => {
  const player = new Player(1);
  player.draft.push(card("Swimming"), card("Swimming"), card("Bushwalking"));
  const chooser = createActivityChooser(new Map());

  const chosen = await chooser.chooseActivity(player, new Set());

  assert.equal(chosen, "Swimming");
});

test("a bot skips when no activity is available", async () => {
  const player = new Player(1);
  player.draft.push(card(null));
  const chooser = createActivityChooser(new Map());

  assert.equal(await chooser.chooseActivity(player, new Set()), undefined);
});

test("a human can skip activities", async () => {
  const player = new Player(0);
  player.draft.push(card("Swimming"), card("Bushwalking"));
  const channel = new FakeChannel(["none"]);
  const chooser = createActivityChooser(new Map([[0, channel]]));

  assert.equal(await chooser.chooseActivity(player, new Set()), undefined);
});

test("a human picks a valid activity", async () => {
  const player = new Player(0);
  player.draft.push(card("Swimming"), card("Bushwalking"));
  const channel = new FakeChannel(["Bushwalking"]);
  const chooser = createActivityChooser(new Map([[0, channel]]));

  assert.equal(await chooser.chooseActivity(player, new Set()), "Bushwalking");
});

test("already-scored activities are not offered", async () => {
  const player = new Player(0);
  player.draft.push(card("Swimming"));
  const channel = new FakeChannel([]);
  const chooser = createActivityChooser(new Map([[0, channel]]));

  assert.equal(
    await chooser.chooseActivity(player, new Set(["Swimming"])),
    undefined,
  );
});

test("announces the catch card before activities for humans", async () => {
  const player = new Player(0);
  player.draft.push(
    card("Swimming"),
    card("Bushwalking"),
    Card.fromRaw("Catch Site", {
      site: "z",
      region: "WA",
      collection_id: 4,
      collection_type: null,
      animal: null,
      activity: "Swimming",
    }),
  );
  const channel = new FakeChannel(["none"]);
  const chooser = createActivityChooser(new Map([[0, channel]]));

  await chooser.chooseActivity(player, new Set());

  const catchIndex = channel.sent.findIndex((m) => m.includes("Your catch card"));
  const activitiesIndex = channel.sent.findIndex((m) =>
    m.includes("Available activities:"),
  );
  assert.notEqual(catchIndex, -1);
  assert.notEqual(activitiesIndex, -1);
  assert.ok(catchIndex < activitiesIndex);
  assert.ok(channel.sent[catchIndex].includes("Catch Site"));
});

test("announces the catch card even when no activities are available", async () => {
  const player = new Player(0);
  player.draft.push(
    Card.fromRaw("Catch Site", {
      site: "z",
      region: "WA",
      collection_id: 4,
      collection_type: null,
      animal: null,
      activity: null,
    }),
  );
  const channel = new FakeChannel([]);
  const chooser = createActivityChooser(new Map([[0, channel]]));

  const chosen = await chooser.chooseActivity(player, new Set());

  assert.equal(chosen, undefined);
  assert.ok(
    channel.sent.some(
      (m) => m.includes("Your catch card") && m.includes("Catch Site"),
    ),
  );
  assert.ok(!channel.sent.some((m) => m.includes("Available activities:")));
});
