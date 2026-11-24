import { test } from "node:test";
import assert from "node:assert/strict";
import { SitesScorer } from "../../src/rules/SitesScorer.js";
import { Card } from "../../src/domain/Card.js";
import type { ScoringContext } from "../../src/domain/Scoring.js";

function card(letter: string): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: "WA",
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

function context(cards: Card[]): ScoringContext {
  return { cards, activitiesAlreadyScored: new Set() };
}

test("scores 1 point per unique site letter", () => {
  const scorer = new SitesScorer();

  const result = scorer.score(
    context([card("A"), card("B"), card("A"), card("C")]),
  );

  assert.equal(result.name, "Sites");
  assert.equal(result.points, 3);
});

test("ignores duplicate site letters across rounds", () => {
  const scorer = new SitesScorer();

  const result = scorer.score(context([card("A"), card("A"), card("A")]));

  assert.equal(result.points, 1);
});

test("an empty collection scores zero", () => {
  const scorer = new SitesScorer();

  const result = scorer.score(context([]));

  assert.equal(result.points, 0);
});
