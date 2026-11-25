import { test } from "node:test";
import assert from "node:assert/strict";
import { CollectionsScorer } from "../../src/rules/CollectionsScorer.js";
import { Card } from "../../src/domain/Card.js";
import type { ScoringContext } from "../../src/domain/Scoring.js";

function card(collection: string | null): Card {
  return Card.fromRaw(`Site ${collection ?? "none"}`, {
    site: "a",
    region: "WA",
    collection_id: 1,
    collection_type: collection,
    animal: null,
    activity: null,
  });
}

function context(cards: Card[]): ScoringContext {
  return { cards, activitiesAlreadyScored: new Set() };
}

test("doubles a collection total of 7 or less", () => {
  const scorer = new CollectionsScorer();

  const result = scorer.score(
    context([card("Leaves"), card("Leaves"), card("Leaves"), card("Shells")]),
  );

  assert.equal(result.name, "Collections");
  assert.equal(result.points, 12); // (3*1 + 1*3) = 6, doubled
  assert.deepEqual(
    result.breakdown,
    new Map([
      ["Leaves", 3],
      ["Shells", 1],
    ]),
  );
});

test("doubles a total of exactly 7", () => {
  const scorer = new CollectionsScorer();

  const result = scorer.score(
    context([card("Souvenirs"), card("Leaves"), card("Leaves")]),
  );

  assert.equal(result.points, 14); // 5 + 1 + 1 = 7, doubled
});

test("does not double a collection total over 7", () => {
  const scorer = new CollectionsScorer();

  const result = scorer.score(
    context([card("Wildflowers"), card("Wildflowers"), card("Souvenirs")]),
  );

  assert.equal(result.points, 9); // (2*2 + 1*5) = 9
});

test("scores zero when no collections are present", () => {
  const scorer = new CollectionsScorer();

  const result = scorer.score(context([card(null), card(null)]));

  assert.equal(result.points, 0);
  assert.equal(result.breakdown, undefined);
});
