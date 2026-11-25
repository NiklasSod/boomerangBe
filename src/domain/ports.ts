import type { Card } from "./Card.js";

/** Loads all cards for a game (JSON file, database, generated, ...). */
export interface ICardSource {
  load(): Promise<Card[]>;
}

/** Number source in [0, upperExclusive) — injectable so games are testable/seeded. */
export interface IRandom {
  nextInt(upperExclusive: number): number;
}

/** Strategy for choosing a card from a hand (human, random bot, future AI). */
export interface IAgent {
  chooseCard(hand: Card[]): Promise<Card>;
}

/** Narrow I/O contract between a player and the outside world (console, socket). */
export interface IMessageChannel {
  send(message: unknown): Promise<void>;
  read(): Promise<string>;
  close(): void;
}
