import { test } from "node:test";
import assert from "node:assert/strict";
import { ActivitiesScorer } from "../../src/rules/ActivitiesScorer.js";
import { Card } from "../../src/domain/Card.js";
import type { ScoringContext } from "../../src/domain/Scoring.js";

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

function context(
  cards: Card[],
  chosenActivity?: string,
  alreadyScored: string[] = [],
): ScoringContext {
  return {
    cards,
    activitiesAlreadyScored: new Set(alreadyScored),
    chosenActivity,
  };
}

test("scores zero when no activity is chosen", () => {
  const scorer = new ActivitiesScorer();

  const result = scorer.score(context([card("Swimming"), card("Swimming")]));

  assert.equal(result.name, "Activities");
  assert.equal(result.points, 0);
  assert.equal(result.scoredActivity, undefined);
});

test("scores per the activity table for 1..6 cards", () => {
  const scorer = new ActivitiesScorer();
  const cases = [
    { count: 1, expected: 0 },
    { count: 2, expected: 2 },
    { count: 3, expected: 4 },
    { count: 4, expected: 7 },
    { count: 5, expected: 10 },
    { count: 6, expected: 15 },
  ];

  for (const { count, expected } of cases) {
    const cards = Array.from({ length: count }, () => card("Swimming"));
    assert.equal(
      scorer.score(context(cards, "Swimming")).points,
      expected,
      `${count} cards`,
    );
  }
});

test("only counts the chosen activity", () => {
  const scorer = new ActivitiesScorer();

  const result = scorer.score(
    context(
      [
        card("Swimming"),
        card("Swimming"),
        card("Swimming"),
        card("Bushwalking"),
        card("Bushwalking"),
      ],
      "Swimming",
    ),
  );

  assert.equal(result.points, 4); // 3 Swimming cards
  assert.equal(result.scoredActivity, "Swimming");
});

test("one card scores zero but still uses up the activity", () => {
  const scorer = new ActivitiesScorer();

  const result = scorer.score(context([card("Swimming")], "Swimming"));

  assert.equal(result.points, 0);
  assert.equal(result.scoredActivity, "Swimming");
});

test("does not score an activity already scored this game", () => {
  const scorer = new ActivitiesScorer();

  const result = scorer.score(
    context(
      [card("Swimming"), card("Swimming"), card("Swimming")],
      "Swimming",
      ["Swimming"],
    ),
  );

  assert.equal(result.points, 0);
  assert.equal(result.scoredActivity, undefined);
});
