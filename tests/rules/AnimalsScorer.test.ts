import { test } from "node:test";
import assert from "node:assert/strict";
import { AnimalsScorer } from "../../src/rules/AnimalsScorer.js";
import { Card } from "../../src/domain/Card.js";
import type { ScoringContext } from "../../src/domain/Scoring.js";

function card(animal: string | null): Card {
  return Card.fromRaw(`Site ${animal ?? "none"}`, {
    site: "a",
    region: "WA",
    collection_id: 1,
    collection_type: null,
    animal,
    activity: null,
  });
}

function context(cards: Card[]): ScoringContext {
  return { cards, activitiesAlreadyScored: new Set() };
}

test("a pair of kangaroos scores 3", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(context([card("Kangaroos"), card("Kangaroos")]));

  assert.equal(result.name, "Animals");
  assert.equal(result.points, 3);
});

test("a single animal scores nothing", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(context([card("Emus")]));

  assert.equal(result.points, 0);
});

test("three of a kind scores as one pair", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(
    context([card("Wombats"), card("Wombats"), card("Wombats")]),
  );

  assert.equal(result.points, 5);
});

test("four of a kind scores as two pairs", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(
    context([card("Koalas"), card("Koalas"), card("Koalas"), card("Koalas")]),
  );

  assert.equal(result.points, 14);
});

test("different pairs are summed", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(
    context([
      card("Kangaroos"),
      card("Kangaroos"),
      card("Platypuses"),
      card("Platypuses"),
    ]),
  );

  assert.equal(result.points, 12); // 3 + 9
});

test("scores zero when no animals are present", () => {
  const scorer = new AnimalsScorer();

  const result = scorer.score(context([card(null), card(null)]));

  assert.equal(result.points, 0);
});
