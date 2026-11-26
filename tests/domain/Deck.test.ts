import { test } from "node:test";
import assert from "node:assert/strict";
import { Deck } from "../../src/domain/Deck.js";
import { Card } from "../../src/domain/Card.js";
import type { IRandom } from "../../src/domain/ports.js";

function card(letter: string): Card {
  return Card.fromRaw(`Site ${letter}`, {
    site: letter.toLowerCase(),
    region: "Test Region",
    collection_id: 1,
    collection_type: null,
    animal: null,
    activity: null,
  });
}

const alwaysFirst: IRandom = { nextInt: () => 0 };

test("shuffle reorders deterministically for a fixed RNG", () => {
  const deck = new Deck([card("A"), card("B"), card("C"), card("D"), card("E")]);
  deck.shuffle(alwaysFirst);

  // Fisher–Yates with j=0 every iteration yields [B, C, D, E, A].
  assert.deepEqual(
    deck.cards.map((c) => c.siteLetter),
    ["B", "C", "D", "E", "A"],
  );
});

test("shuffle preserves the exact set of cards", () => {
  const deck = new Deck([card("A"), card("B"), card("C"), card("D"), card("E")]);
  deck.shuffle(alwaysFirst);

  const letters = deck.cards.map((c) => c.siteLetter).sort();
  assert.deepEqual(letters, ["A", "B", "C", "D", "E"]);
});

test("draw removes and returns the top card", () => {
  const deck = new Deck([card("A"), card("B"), card("C")]);

  assert.equal(deck.size, 3);
  assert.equal(deck.draw().siteLetter, "C");
  assert.equal(deck.size, 2);
  assert.deepEqual(
    deck.cards.map((c) => c.siteLetter),
    ["A", "B"],
  );
});

test("draw throws when the deck is empty", () => {
  const deck = new Deck([card("A")]);
  deck.draw();

  assert.throws(() => deck.draw(), /empty deck/);
});

test("constructor copies the input array", () => {
  const source = [card("A"), card("B")];
  const deck = new Deck(source);
  source.push(card("C"));

  assert.equal(deck.size, 2);
});
