import { test } from "node:test";
import assert from "node:assert/strict";
import { RegionTracker } from "../../src/domain/RegionTracker.js";
import { Card } from "../../src/domain/Card.js";

function card(letter: string, region: string): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region,
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

test("detects a complete region only after 4 distinct sites", () => {
  const tracker = new RegionTracker();

  tracker.recordSites(0, [card("A", "WA"), card("B", "WA")]);
  assert.equal(tracker.isRegionComplete(0, "WA"), false);

  tracker.recordSites(0, [card("C", "WA"), card("D", "WA")]);
  assert.equal(tracker.isRegionComplete(0, "WA"), true);
});

test("recordSites ignores duplicate letters", () => {
  const tracker = new RegionTracker();

  tracker.recordSites(0, [card("A", "WA"), card("A", "WA")]);
  assert.equal(tracker.isRegionComplete(0, "WA"), false);

  tracker.recordSites(0, [card("B", "WA"), card("C", "WA"), card("D", "WA")]);
  assert.equal(tracker.isRegionComplete(0, "WA"), true);
});

test("sitesFor returns the unique site letters collected", () => {
  const tracker = new RegionTracker();

  tracker.recordSites(0, [card("A", "WA"), card("B", "WA"), card("A", "WA")]);

  assert.deepEqual([...tracker.sitesFor(0)].sort(), ["A", "B"]);
});

test("two players completing the same region in one round both score +3", () => {
  const tracker = new RegionTracker();
  const waSites = [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
  ];
  tracker.recordSites(0, waSites);
  tracker.recordSites(1, waSites);

  const bonuses = tracker.awardRoundBonuses(["WA"], [0, 1]);

  assert.deepEqual(bonuses, [
    { playerId: 0, region: "WA" },
    { playerId: 1, region: "WA" },
  ]);
  assert.equal(tracker.claimed.has("WA"), true);
});

test("a region claimed in an earlier round is locked for later rounds", () => {
  const tracker = new RegionTracker();
  const waSites = [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
  ];

  // Round 1: only player 0 completes WA, so it is claimed.
  tracker.recordSites(0, waSites);
  assert.deepEqual(tracker.awardRoundBonuses(["WA"], [0, 1]), [
    { playerId: 0, region: "WA" },
  ]);

  // Round 2: player 1 now also completes WA, but it is already claimed.
  tracker.recordSites(1, waSites);
  assert.deepEqual(tracker.awardRoundBonuses(["WA"], [0, 1]), []);
});
