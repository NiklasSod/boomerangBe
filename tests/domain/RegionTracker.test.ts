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

test("awards the first completer in player order, once per region", () => {
  const tracker = new RegionTracker();
  const waSites = [card("A", "WA"), card("B", "WA"), card("C", "WA"), card("D", "WA")];
  tracker.recordSites(0, waSites);
  tracker.recordSites(1, waSites);

  const bonuses = tracker.awardFirstCompletions(["WA"], [0, 1]);
  assert.deepEqual(bonuses, [{ playerId: 0, region: "WA" }]);

  const again = tracker.awardFirstCompletions(["WA"], [0, 1]);
  assert.deepEqual(again, []);
});

test("gives the bonus to the first player in order who is complete", () => {
  const tracker = new RegionTracker();
  tracker.recordSites(0, [card("A", "WA"), card("B", "WA")]); // incomplete
  tracker.recordSites(1, [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
  ]);

  const bonuses = tracker.awardFirstCompletions(["WA"], [0, 1]);
  assert.deepEqual(bonuses, [{ playerId: 1, region: "WA" }]);
});

test("tracks claimed regions", () => {
  const tracker = new RegionTracker();
  tracker.recordSites(0, [
    card("A", "WA"),
    card("B", "WA"),
    card("C", "WA"),
    card("D", "WA"),
  ]);

  tracker.awardFirstCompletions(["WA"], [0]);

  assert.equal(tracker.claimed.has("WA"), true);
});
