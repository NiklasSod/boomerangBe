import { test } from "node:test";
import assert from "node:assert/strict";
import { Player } from "../../src/domain/Player.js";
import { Card } from "../../src/domain/Card.js";

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

test("new player has empty state and zero score", () => {
  const player = new Player(3);

  assert.equal(player.id, 3);
  assert.deepEqual(player.hand, []);
  assert.deepEqual(player.draft, []);
  assert.equal(player.totalScore, 0);
});

test("receive adds cards to the hand", () => {
  const player = new Player(0);
  player.receive([card("A"), card("B")]);

  assert.deepEqual(player.hand.map((c) => c.siteLetter), ["A", "B"]);
});

test("setHand replaces the hand", () => {
  const player = new Player(0);
  player.receive([card("A"), card("B"), card("C")]);
  player.setHand([card("D"), card("E")]);

  assert.deepEqual(player.hand.map((c) => c.siteLetter), ["D", "E"]);
});

test("moveToDraft removes from hand and appends to draft", () => {
  const player = new Player(0);
  const a = card("A");
  const b = card("B");
  player.receive([a, b]);

  player.moveToDraft(b);

  assert.deepEqual(player.hand.map((c) => c.siteLetter), ["A"]);
  assert.deepEqual(player.draft.map((c) => c.siteLetter), ["B"]);
});

test("moveToDraft throws when the card is not in hand", () => {
  const player = new Player(0);
  player.receive([card("A")]);

  assert.throws(() => player.moveToDraft(card("Z")), /not in the player's hand/);
});

test("addLastCard appends to draft without removing from hand", () => {
  const player = new Player(0);
  player.receive([card("A")]);

  player.addLastCard(card("B"));

  assert.deepEqual(player.hand.map((c) => c.siteLetter), ["A"]);
  assert.deepEqual(player.draft.map((c) => c.siteLetter), ["B"]);
});

test("totalScore sums round scores plus 3 per region bonus", () => {
  const player = new Player(0);
  player.recordRoundScore(10);
  player.recordRoundScore(5);
  player.awardRegionBonus("Western Australia");

  assert.equal(player.totalScore, 18);
});

test("resetForRound clears hand and draft", () => {
  const player = new Player(0);
  const a = card("A");
  player.receive([a]);
  player.moveToDraft(a);

  player.resetForRound();

  assert.deepEqual(player.hand, []);
  assert.deepEqual(player.draft, []);
});
