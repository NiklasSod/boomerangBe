import type { Card } from "../domain/Card.js";
import type { Player } from "../domain/Player.js";
import type { IAgent } from "../domain/ports.js";

export type PassDirection = "clockwise" | "anticlockwise";

export interface DraftCoordinatorOptions {
  /** Base pass direction for the picks. `true` = clockwise (left). */
  clockwise?: boolean;
  /** Flip the base direction on even-numbered rounds. */
  alternateEachRound?: boolean;
  /** Send the catch card opposite to the round's pass direction. */
  catchOppositeDirection?: boolean;
}

const PLAYER_MIN = 2;
const PLAYER_MAX = 4;
const HAND_SIZE = 7;
const PICKS_WITH_CHOICE = 5;

/**
 * Orchestrates one round of drafting. Players choose concurrently via
 * Promise.all; the pass direction and catch-card direction are configurable
 * through DraftCoordinatorOptions.
 */
export class DraftCoordinator {
  private readonly clockwise: boolean;
  private readonly alternateEachRound: boolean;
  private readonly catchOppositeDirection: boolean;

  constructor(options: DraftCoordinatorOptions = {}) {
    this.clockwise = options.clockwise ?? true;
    this.alternateEachRound = options.alternateEachRound ?? false;
    this.catchOppositeDirection = options.catchOppositeDirection ?? true;
  }

  async runRound(
    players: readonly Player[],
    agents: readonly IAgent[],
    roundNumber: number,
  ): Promise<void> {
    this.validate(players, agents);

    const passDirection = this.roundPassDirection(roundNumber);
    const catchDirection = this.catchPassDirection(passDirection);

    // Each player picks a hidden Throw card from their own 7-card hand.
    const throwChoices = await Promise.all(
      players.map((player, i) => agents[i].chooseCard(player.hand)),
    );
    for (let i = 0; i < players.length; i++) {
      players[i].moveToDraft(throwChoices[i]);
    }

    // Five picks: pass the remaining hand, then everyone picks one card.
    for (let pick = 0; pick < PICKS_WITH_CHOICE; pick++) {
      this.passHands(players, passDirection);
      const choices = await Promise.all(
        players.map((player, i) => agents[i].chooseCard(player.hand)),
      );
      for (let i = 0; i < players.length; i++) {
        players[i].moveToDraft(choices[i]);
      }
    }

    // Catch card: the single remaining card, passed in the catch direction.
    this.passHands(players, catchDirection);
    for (const player of players) {
      player.moveToDraft(player.hand[0]);
    }
  }

  private validate(players: readonly Player[], agents: readonly IAgent[]): void {
    if (players.length < PLAYER_MIN || players.length > PLAYER_MAX) {
      throw new Error("DraftCoordinator requires between 2 and 4 players");
    }
    if (agents.length !== players.length) {
      throw new Error("DraftCoordinator requires one agent per player");
    }
    for (const player of players) {
      if (player.hand.length !== HAND_SIZE || player.draft.length !== 0) {
        throw new Error(
          "Each player must start the round with a 7-card hand and an empty draft",
        );
      }
    }
  }

  private roundPassDirection(roundNumber: number): PassDirection {
    const flip = this.alternateEachRound && roundNumber % 2 === 0;
    return this.clockwise !== flip ? "clockwise" : "anticlockwise";
  }

  private catchPassDirection(passDirection: PassDirection): PassDirection {
    if (!this.catchOppositeDirection) {
      return passDirection;
    }
    return passDirection === "clockwise" ? "anticlockwise" : "clockwise";
  }

  private passHands(players: readonly Player[], direction: PassDirection): void {
    const count = players.length;
    const nextHands = players.map(() => [] as Card[]);
    for (let i = 0; i < count; i++) {
      const target =
        direction === "clockwise" ? (i + 1) % count : (i - 1 + count) % count;
      nextHands[target] = [...players[i].hand];
    }
    for (let i = 0; i < count; i++) {
      players[i].setHand(nextHands[i]);
    }
  }
}
