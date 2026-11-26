import { test } from "node:test";
import assert from "node:assert/strict";
import type { Socket } from "socket.io";
import {
  DISPLAY_EVENT,
  INPUT_EVENT,
  REQUEST_INPUT_EVENT,
  SocketChannel,
} from "../../src/net/SocketChannel.js";

class FakeSocket {
  readonly emitted: { event: string; args: unknown[] }[] = [];
  readonly listeners = new Map<string, (...args: unknown[]) => void>();

  emit(event: string, ...args: unknown[]): boolean {
    this.emitted.push({ event, args });
    return true;
  }

  once(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.set(event, listener);
    return this;
  }
}

test("send emits a display event", async () => {
  const socket = new FakeSocket();
  const channel = new SocketChannel(socket as unknown as Socket);

  await channel.send("hello");

  assert.deepEqual(socket.emitted[0], {
    event: DISPLAY_EVENT,
    args: ["hello"],
  });
});

test("read requests input and resolves with the reply", async () => {
  const socket = new FakeSocket();
  const channel = new SocketChannel(socket as unknown as Socket);

  const reading = channel.read();

  assert.equal(socket.emitted[0].event, REQUEST_INPUT_EVENT);
  socket.listeners.get(INPUT_EVENT)?.("A");
  assert.equal(await reading, "A");
});
