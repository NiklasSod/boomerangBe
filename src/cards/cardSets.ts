import type { ICardSource } from "../domain/ports.js";
import { australiaConfig } from "./australia.js";

/**
 * Everything that differs between game variants (Australia, Europe, USA).
 * A card set is pure data: its JSON source plus the values its rules use.
 */
export interface CardSetConfig {
  readonly name: string;
  readonly cardSource: ICardSource;
  /** Number of distinct sites a player needs to complete a region. */
  readonly sitesPerRegion: number;
  /** Collection type -> point value. */
  readonly collectionValues: ReadonlyMap<string, number>;
  /** Animal type -> point value (per pair). */
  readonly animalValues: ReadonlyMap<string, number>;
}

/**
 * Registry of playable card sets. Adding a new variant means adding one
 * config object here (plus its JSON file) — no rule or engine changes.
 */
const CARD_SETS: ReadonlyMap<string, CardSetConfig> = new Map([
  [australiaConfig.name, australiaConfig],
]);

export function availableCardSets(): readonly string[] {
  return [...CARD_SETS.keys()];
}

export function getCardSet(name: string): CardSetConfig {
  const config = CARD_SETS.get(name.toLowerCase());
  if (config === undefined) {
    throw new Error(
      `Unknown card set "${name}". Available: ${[...CARD_SETS.keys()].join(", ")}`,
    );
  }
  return config;
}
