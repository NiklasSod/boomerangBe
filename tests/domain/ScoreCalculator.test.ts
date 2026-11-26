import { test } from "node:test";
import assert from "node:assert/strict";
import { ScoreCalculator } from "../../src/domain/ScoreCalculator.js";
import type {
  CategoryResult,
  IScoreCategory,
  ScoringContext,
} from "../../src/domain/Scoring.js";

class StubCategory implements IScoreCategory {
  constructor(
    readonly name: string,
    readonly points: number,
  ) {}

  score(_ctx: ScoringContext): CategoryResult {
    return { name: this.name, points: this.points };
  }
}

function context(): ScoringContext {
  return { cards: [], activitiesAlreadyScored: new Set() };
}

test("scoreRound runs each round category and sums points", () => {
  const calc = new ScoreCalculator([
    new StubCategory("Throw and Catch", 5),
    new StubCategory("Collections", 3),
  ]);

  const report = calc.scoreRound(context());

  assert.deepEqual(
    report.results.map((r) => r.name),
    ["Throw and Catch", "Collections"],
  );
  assert.equal(report.total, 8);
});

test("scoreRound with no categories returns an empty report", () => {
  const calc = new ScoreCalculator([]);

  const report = calc.scoreRound(context());

  assert.deepEqual(report.results, []);
  assert.equal(report.total, 0);
});

test("scoreFinal runs only the final categories", () => {
  const calc = new ScoreCalculator(
    [new StubCategory("round-only", 1)],
    [new StubCategory("Sites", 7)],
  );

  const report = calc.scoreFinal(context());

  assert.deepEqual(report.results.map((r) => r.name), ["Sites"]);
  assert.equal(report.total, 7);
});
