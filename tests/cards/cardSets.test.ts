import { test } from "node:test";
import assert from "node:assert/strict";
import { availableCardSets, getCardSet } from "../../src/cards/cardSets.js";

test("registers the australia card set with its values", () => {
  assert.deepEqual(availableCardSets(), ["australia"]);

  const config = getCardSet("australia");
  assert.equal(config.name, "australia");
  assert.equal(config.sitesPerRegion, 4);
  assert.equal(config.collectionValues.get("Leaves"), 1);
  assert.equal(config.collectionValues.get("Souvenirs"), 5);
  assert.equal(config.animalValues.get("Kangaroos"), 3);
  assert.equal(config.animalValues.get("Platypuses"), 9);
});

test("looks up card sets case-insensitively", () => {
  assert.equal(getCardSet("AUSTRALIA").name, "australia");
});

test("rejects an unknown card set", () => {
  assert.throws(() => getCardSet("europe"), /Unknown card set "europe"/);
});

test("loads the australia deck through its card source", async () => {
  const cards = await getCardSet("australia").cardSource.load();

  assert.equal(cards.length, 28);
  assert.equal(new Set(cards.map((c) => c.region)).size, 7);
});
