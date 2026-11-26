import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { ConsoleChannel } from "../../src/adapters/ConsoleChannel.js";

test("send writes the message followed by a newline", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const channel = new ConsoleChannel(input, output);

  await channel.send("hello");
  channel.close();

  assert.equal(output.read()?.toString(), "hello\n");
});

test("read resolves with the next line from input", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const channel = new ConsoleChannel(input, output);

  const pending = channel.read();
  input.write("A\n");
  const answer = await pending;
  channel.close();

  assert.equal(answer, "A");
});
