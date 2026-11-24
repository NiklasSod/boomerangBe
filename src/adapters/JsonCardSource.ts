import { readFile } from "node:fs/promises";
import { Card } from "../domain/Card.js";
import type { RawCardData } from "../domain/Card.js";
import type { ICardSource } from "../domain/ports.js";

/** Loads cards from a JSON file whose shape matches cards.json. */
export class JsonCardSource implements ICardSource {
  constructor(private readonly filePath: string | URL) {}

  async load(): Promise<Card[]> {
    const json = await readFile(this.filePath, "utf8");
    const data = JSON.parse(json) as Record<string, RawCardData>;

    const cards = Object.entries(data).map(([name, raw]) =>
      Card.fromRaw(name, raw),
    );

    this.validate(cards);
    return cards;
  }

  private validate(cards: Card[]): void {
    const letters = new Set<string>();
    for (const c of cards) {
      if (letters.has(c.siteLetter)) {
        throw new Error(`Duplicate site letter in card source: ${c.siteLetter}`);
      }
      letters.add(c.siteLetter);
    }

    const countsByRegion = new Map<string, number>();
    for (const c of cards) {
      countsByRegion.set(c.region, (countsByRegion.get(c.region) ?? 0) + 1);
    }

    for (const [region, count] of countsByRegion) {
      if (count !== 4) {
        throw new Error(`Region "${region}" has ${count} cards; expected 4`);
      }
    }
  }
}
