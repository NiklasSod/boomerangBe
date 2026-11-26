import { Deck } from "../domain/Deck.js";
import type { Card } from "../domain/Card.js";
import type { Player } from "../domain/Player.js";
import type { IAgent, IRandom } from "../domain/ports.js";
import type { ScoreCalculator } from "../domain/ScoreCalculator.js";
import type { PlayerRoundReport, RoundManager } from "./RoundManager.js";

export interface GameResult {
  readonly winnerId: number;
  readonly totals: ReadonlyMap<number, number>;
}

/** Snapshot handed to an observer once the game has finished. */
export interface GameEndContext {
  readonly players: readonly Player[];
  readonly result: GameResult;
  readonly collectedCards: ReadonlyMap<number, readonly Card[]>;
}

/** Optional game lifecycle hooks for reporting progress to players. */
export interface GameObserver {
  onRoundStart?(round: number): Promise<void> | void;
  onRoundEnd?(
    round: number,
    reports: readonly PlayerRoundReport[],
  ): Promise<void> | void;
  onGameEnd?(context: GameEndContext): Promise<void> | void;
}

/** Fans one observer slot out to several observers (one per player/channel). */
export function composeObservers(
  observers: readonly GameObserver[],
): GameObserver {
  return {
    async onRoundStart(round) {
      await Promise.all(observers.map((o) => o.onRoundStart?.(round)));
    },
    async onRoundEnd(round, reports) {
      await Promise.all(observers.map((o) => o.onRoundEnd?.(round, reports)));
    },
    async onGameEnd(context) {
      await Promise.all(observers.map((o) => o.onGameEnd?.(context)));
    },
  };
}

const TOTAL_ROUNDS = 4;
const HAND_SIZE = 7;

/** Picks the winner: highest total, then most Throw & Catch points. */
export function determineWinner(
  players: readonly Player[],
  throwAndCatchTotals: ReadonlyMap<number, number>,
): GameResult {
  const sorted = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return (
      (throwAndCatchTotals.get(b.id) ?? 0) -
      (throwAndCatchTotals.get(a.id) ?? 0)
    );
  });
  return {
    winnerId: sorted[0].id,
    totals: new Map(players.map((player) => [player.id, player.totalScore])),
  };
}

/**
 * Runs a complete 4-round game: shuffle and deal each round, draft and
 * score, then award the end-of-game Sites category and pick the winner.
 */
export class GameEngine {
  private readonly collectedCards = new Map<number, Card[]>();
  private dealtLastRound: Card[] = [];
  private sideDeck: Card[] = [];

  constructor(
    private readonly cards: readonly Card[],
    private readonly players: readonly Player[],
    private readonly agents: readonly IAgent[],
    private readonly roundManager: RoundManager,
    private readonly scoreCalculator: ScoreCalculator,
    private readonly random: IRandom,
  ) {}

  async play(observer?: GameObserver): Promise<GameResult> {
    const throwAndCatchTotals = new Map<number, number>();

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      await observer?.onRoundStart?.(round);
      this.dealRound();
      const reports = await this.roundManager.runRound(
        this.players,
        this.agents,
        round,
      );

      for (const player of this.players) {
        const collected = this.collectedCards.get(player.id) ?? [];
        collected.push(...player.draft);
        this.collectedCards.set(player.id, collected);
      }
      for (const report of reports) {
        const throwAndCatch =
          report.results.find((result) => result.name === "Throw and Catch")
            ?.points ?? 0;
        throwAndCatchTotals.set(
          report.playerId,
          (throwAndCatchTotals.get(report.playerId) ?? 0) + throwAndCatch,
        );
      }

      await observer?.onRoundEnd?.(round, reports);
    }

    for (const player of this.players) {
      const report = this.scoreCalculator.scoreFinal({
        cards: this.collectedCards.get(player.id) ?? [],
        activitiesAlreadyScored: new Set(),
      });
      player.recordFinalScore(report.total);
    }

    const result = determineWinner(this.players, throwAndCatchTotals);
    await observer?.onGameEnd?.({
      players: this.players,
      result,
      collectedCards: this.collectedCards,
    });
    return result;
  }

  private dealRound(): void {
    let pile: Card[];
    if (this.dealtLastRound.length === 0) {
      const deck = new Deck(this.cards);
      deck.shuffle(this.random);
      pile = [...deck.cards];
    } else {
      const usedDeck = new Deck(this.dealtLastRound);
      usedDeck.shuffle(this.random);
      // Side-deck goes last so Deck.draw (which pops the end) deals it first,
      // guaranteeing cards set aside last round appear this round.
      pile = [...usedDeck.cards, ...this.sideDeck];
    }

    const deck = new Deck(pile);
    const dealt: Card[] = [];
    for (const player of this.players) {
      player.resetForRound();
      const hand: Card[] = [];
      for (let i = 0; i < HAND_SIZE; i++) {
        const card = deck.draw();
        hand.push(card);
        dealt.push(card);
      }
      player.setHand(hand);
    }
    this.dealtLastRound = dealt;
    this.sideDeck = [...deck.cards];
  }
}
