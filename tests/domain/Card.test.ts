import { test } from "node:test";
import assert from "node:assert/strict";
import { Card } from "../../src/domain/Card.js";
import type { RawCardData } from "../../src/domain/Card.js";

const bungleBungles: RawCardData = {
  site: "a",
  region: "Western Australia",
  collection_id: 1,
  collection_type: "Leaves",
  animal: null,
  activity: "Indigenous Culture",
};

test("fromRaw maps every field of a fully-populated card", () => {
  const card = Card.fromRaw("The Bungle Bungles", bungleBungles);

  assert.equal(card.name, "The Bungle Bungles");
  assert.equal(card.siteLetter, "A");
  assert.equal(card.region, "Western Australia");
  assert.equal(card.number, 1);
  assert.equal(card.collection, "Leaves");
  assert.equal(card.animal, null);
  assert.equal(card.activity, "Indigenous Culture");
});

test("fromRaw keeps null fields null", () => {
  const card = Card.fromRaw("The Pinnacles", {
    site: "b",
    region: "Western Australia",
    collection_id: 1,
    collection_type: null,
    animal: "Kangaroos",
    activity: "Sightseeing",
  });

  assert.equal(card.collection, null);
  assert.equal(card.animal, "Kangaroos");
});

test("fromRaw uppercases letters and leaves symbols unchanged", () => {
  const portArthur = Card.fromRaw("Port Arthur", {
    site: "*",
    region: "Tasmania",
    collection_id: 7,
    collection_type: "Leaves",
    animal: null,
    activity: "Indigenous Culture",
  });

  assert.equal(portArthur.siteLetter, "*");
});

test("equals compares by site letter only", () => {
  const cardA = Card.fromRaw("The Bungle Bungles", bungleBungles);
  const sameLetterDifferentName = Card.fromRaw("Uluru", {
    ...bungleBungles,
    region: "Northern Territory",
    collection_id: 4,
  });
  const differentLetter = Card.fromRaw("The Pinnacles", {
    ...bungleBungles,
    site: "b",
  });

  assert.equal(cardA.equals(sameLetterDifferentName), true);
  assert.equal(cardA.equals(differentLetter), false);
});
