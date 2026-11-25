import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCliArgs, runLocalGame } from "../src/cli.js";

test("parses a single argument as a client IP", () => {
  assert.deepEqual(parseCliArgs(["127.0.0.1"]), {
    mode: "client",
    ip: "127.0.0.1",
  });
});

test("parses server arguments with and without a seed", () => {
  assert.deepEqual(parseCliArgs(["2", "1"]), {
    mode: "server",
    numPlayers: 2,
    numBots: 1,
    seed: undefined,
    cardSet: "australia",
  });
  assert.deepEqual(parseCliArgs(["2", "1", "42"]), {
    mode: "server",
    numPlayers: 2,
    numBots: 1,
    seed: 42,
    cardSet: "australia",
  });
  assert.deepEqual(parseCliArgs(["2", "1", "42", "usa"]), {
    mode: "server",
    numPlayers: 2,
    numBots: 1,
    seed: 42,
    cardSet: "usa",
  });
});

test("returns help when no arguments are given", () => {
  const result = parseCliArgs([]);

  assert.equal(result.mode, "help");
});

test("rejects invalid player and bot counts", () => {
  assert.equal(parseCliArgs(["0", "1"]).mode, "help");
  assert.equal(parseCliArgs(["2", "3"]).mode, "help"); // total of 5
  assert.equal(parseCliArgs(["2", "x"]).mode, "help");
});

test("runLocalGame rejects more than one local human until step 20", async () => {
  await assert.rejects(() => runLocalGame(2, 0), /one local human/);
});
