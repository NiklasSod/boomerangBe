import { test } from "node:test";
import assert from "node:assert/strict";
import { HumanPickNotifier } from "../../src/adapters/HumanPickNotifier.js";
import type { IMessageChannel } from "../../src/domain/ports.js";

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

test("tells the picker to wait and the others who is waiting", async () => {
  const channel0 = new FakeChannel();
  const channel1 = new FakeChannel();
  const notifier = new HumanPickNotifier(
    new Map([
      [0, channel0],
      [1, channel1],
    ]),
  );

  await notifier.onPlayerPicked(0, [1]);

  assert.deepEqual(channel0.sent, ["Waiting for other players"]);
  assert.deepEqual(channel1.sent, ["Player 0 is waiting for you"]);
});

test("ignores picks from bots", async () => {
  const channel0 = new FakeChannel();
  const notifier = new HumanPickNotifier(new Map([[0, channel0]]));

  // Player 1 is a bot, so nobody is told to wait for it.
  await notifier.onPlayerPicked(1, [0]);

  assert.deepEqual(channel0.sent, []);
});

test("does not tell a picker to wait when only bots remain", async () => {
  const channel0 = new FakeChannel();
  const notifier = new HumanPickNotifier(new Map([[0, channel0]]));

  await notifier.onPlayerPicked(0, [1]);

  assert.deepEqual(channel0.sent, []);
});

test("notifies the same way when an activity is chosen", async () => {
  const channel0 = new FakeChannel();
  const channel1 = new FakeChannel();
  const notifier = new HumanPickNotifier(
    new Map([
      [0, channel0],
      [1, channel1],
    ]),
  );

  await notifier.onActivityChosen(1, [0]);

  assert.deepEqual(channel0.sent, ["Player 1 is waiting for you"]);
  assert.deepEqual(channel1.sent, ["Waiting for other players"]);
});
