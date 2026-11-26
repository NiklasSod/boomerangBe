import { test } from "node:test";
import assert from "node:assert/strict";
import { SeededRandom } from "../../src/adapters/SeededRandom.js";

test("same seed produces the same sequence", () => {
  const a = new SeededRandom(42);
  const b = new SeededRandom(42);

  for (let i = 0; i < 100; i++) {
    assert.equal(a.nextInt(28), b.nextInt(28));
  }
});

test("different seeds produce different sequences", () => {
  const a = new SeededRandom(1);
  const b = new SeededRandom(2);

  const seqA = Array.from({ length: 10 }, () => a.nextInt(1000));
  const seqB = Array.from({ length: 10 }, () => b.nextInt(1000));

  assert.notDeepEqual(seqA, seqB);
});

test("nextInt always returns an integer in [0, upperExclusive)", () => {
  const rng = new SeededRandom(123);

  for (let i = 0; i < 1000; i++) {
    const value = rng.nextInt(7);
    assert.ok(Number.isInteger(value));
    assert.ok(value >= 0 && value < 7);
  }
});
