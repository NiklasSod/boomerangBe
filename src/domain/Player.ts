import type { Card } from "./Card.js";

/**
 * Pure domain entity holding one player's game state.
 * Contains no I/O or agent references — those live in orchestration.
 */
export class Player {
  readonly id: number;
  readonly hand: Card[] = [];
  readonly draft: Card[] = [];
  readonly regionBonuses: string[] = [];
  readonly roundScores: number[] = [];

  constructor(id: number) {
    this.id = id;
  }

  /** Sum of scored rounds plus +3 per completed-region bonus. */
  get totalScore(): number {
    const rounds = this.roundScores.reduce((sum, score) => sum + score, 0);
    return rounds + this.regionBonuses.length * 3;
  }

  receive(cards: readonly Card[]): void {
    this.hand.push(...cards);
  }

  setHand(cards: readonly Card[]): void {
    this.hand.length = 0;
    this.hand.push(...cards);
  }

  /** Removes the card (matched by site letter) from hand and appends it to draft. */
  moveToDraft(card: Card): void {
    const index = this.hand.findIndex((c) => c.equals(card));
    if (index === -1) {
      throw new Error("Card is not in the player's hand");
    }
    this.hand.splice(index, 1);
    this.draft.push(card);
  }

  /** Adds the 7th card (kept by the player) to the draft without drafting it. */
  addLastCard(card: Card): void {
    this.draft.push(card);
  }

  awardRegionBonus(region: string): void {
    this.regionBonuses.push(region);
  }

  recordRoundScore(points: number): void {
    this.roundScores.push(points);
  }

  /** Clears hand and draft for a new round. */
  resetForRound(): void {
    this.hand.length = 0;
    this.draft.length = 0;
  }
}
