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

test("completedRegions lists regions where the player has all 4 sites", () => {
  const tracker = new RegionTracker();

  tracker.recordSites(0, [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
    card("W", "TAS"),
    card("X", "TAS"),
  ]);

  assert.deepEqual(tracker.completedRegions(0, ["WA", "TAS"]), ["WA"]);
});

test("two players can both complete and score the same region", () => {
  const tracker = new RegionTracker();
  const waSites = [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
  ];
  tracker.recordSites(0, waSites);
  tracker.recordSites(1, waSites);

  const regions = ["WA"];
  assert.deepEqual(tracker.completedRegions(0, regions), ["WA"]);
  assert.deepEqual(tracker.completedRegions(1, regions), ["WA"]);

  // Both players earn the +3 region bonus.
  assert.equal(tracker.completedRegions(0, regions).length * 3, 3);
  assert.equal(tracker.completedRegions(1, regions).length * 3, 3);
});
