import { test } from "node:test";
import assert from "node:assert/strict";
import { createScoreCalculator } from "../../src/rules/createScoreCalculator.js";
import { Card } from "../../src/domain/Card.js";
import { australiaConfig } from "../../src/cards/australia.js";

const scoreConfig = {
  collectionValues: australiaConfig.collectionValues,
  animalValues: australiaConfig.animalValues,
};

interface DraftCard {
  letter: string;
  number: number;
  collection?: string | null;
  animal?: string | null;
  activity?: string | null;
}

function card({
  letter,
  number,
  collection = null,
  animal = null,
  activity = null,
}: DraftCard): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: "WA",
    collection_id: number,
    collection_type: collection,
    animal,
    activity,
  });
}

// Fixed 7-card draft with known totals:
// Throw & Catch |4 - 1| = 3; Collections (1+1+1+3) * 2 = 12;
// Animals one Kangaroo pair = 3; Activities 3x Swimming = 4.
const draft = [
  card({ letter: "A", number: 4, collection: "Leaves", activity: "Swimming" }),
  card({ letter: "B", number: 2, collection: "Leaves", animal: "Kangaroos" }),
  card({ letter: "C", number: 6, collection: "Leaves", activity: "Swimming" }),
  card({ letter: "D", number: 3, collection: "Shells", animal: "Kangaroos" }),
  card({ letter: "E", number: 5, animal: "Emus" }),
  card({ letter: "F", number: 7, activity: "Swimming" }),
  card({ letter: "G", number: 1 }),
];

test("scores a fixed round draft through every round rule", () => {
  const calc = createScoreCalculator(scoreConfig);

  const report = calc.scoreRound({
    cards: draft,
    activitiesAlreadyScored: new Set(),
    chosenActivity: "Swimming",
  });

  assert.deepEqual(
    report.results.map((r) => [r.name, r.points]),
    [
      ["Throw and Catch", 3],
      ["Collections", 12],
      ["Animals", 3],
      ["Activities", 4],
    ],
  );
  assert.equal(report.total, 22);
});

test("scores the final site rule from the same fixed draft", () => {
  const calc = createScoreCalculator(scoreConfig);

  const report = calc.scoreFinal({
    cards: draft,
    activitiesAlreadyScored: new Set(),
  });

  assert.deepEqual(report.results.map((r) => [r.name, r.points]), [
    ["Sites", 7],
  ]);
  assert.equal(report.total, 7);
});

test("wires a custom card set's values into the rules", () => {
  const calc = createScoreCalculator({
    collectionValues: new Map([["Leaves", 6]]),
    animalValues: new Map([["Kangaroos", 11]]),
  });

  const report = calc.scoreRound({
    cards: [
      card({ letter: "A", number: 1, collection: "Leaves" }),
      card({ letter: "B", number: 1, animal: "Kangaroos" }),
      card({ letter: "C", number: 1, animal: "Kangaroos" }),
    ],
    activitiesAlreadyScored: new Set(),
  });

  assert.deepEqual(
    report.results.map((r) => [r.name, r.points]),
    [
      ["Throw and Catch", 0],
      ["Collections", 12], // one leaf = 6, doubled
      ["Animals", 11], // one kangaroo pair at the custom value
      ["Activities", 0],
    ],
  );
});
