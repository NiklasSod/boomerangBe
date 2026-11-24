import { test } from "node:test";
import assert from "node:assert/strict";
import { ThrowAndCatchScorer } from "../../src/rules/ThrowAndCatchScorer.js";
import { Card } from "../../src/domain/Card.js";
import type { ScoringContext } from "../../src/domain/Scoring.js";

function card(number: number): Card {
  return Card.fromRaw(`Site ${number}`, {
    site: String(number),
    region: "WA",
    collection_id: number,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

function context(cards: Card[]): ScoringContext {
  return { cards, activitiesAlreadyScored: new Set() };
}

test("scores the absolute difference between first and last card numbers", () => {
  const scorer = new ThrowAndCatchScorer();

  const result = scorer.score(context([card(5), card(3), card(1)]));

  assert.equal(result.name, "Throw and Catch");
  assert.equal(result.points, 4);
});

test("returns a positive score when the last number is larger", () => {
  const scorer = new ThrowAndCatchScorer();

  const result = scorer.score(context([card(1), card(2), card(7)]));

  assert.equal(result.points, 6);
});

test("scores zero when the first and last numbers match", () => {
  const scorer = new ThrowAndCatchScorer();

  const result = scorer.score(context([card(4), card(1), card(4)]));

  assert.equal(result.points, 0);
});

test("a single-card draft throws because there is no catch card", () => {
  const scorer = new ThrowAndCatchScorer();

  assert.throws(() => scorer.score(context([card(3)])), /throw card and a catch card/);
});

test("an empty draft throws because there is no throw card", () => {
  const scorer = new ThrowAndCatchScorer();

  assert.throws(() => scorer.score(context([])), /throw card and a catch card/);
});
