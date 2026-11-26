/** Raw shape of a single entry in cards.json, keyed by site name. */
export interface RawCardData {
  site: string;
  region: string;
  collection_id: number;
  collection_type: string | null;
  animal: string | null;
  activity: string | null;
}

/**
 * Domain value object for one Boomerang Australia card.
 * Immutable (readonly + frozen) and identified by its site letter.
 */
export class Card {
  readonly name: string;
  readonly siteLetter: string;
  readonly region: string;
  readonly number: number;
  readonly collection: string | null;
  readonly animal: string | null;
  readonly activity: string | null;

  private constructor(
    name: string,
    siteLetter: string,
    region: string,
    number: number,
    collection: string | null,
    animal: string | null,
    activity: string | null,
  ) {
    this.name = name;
    this.siteLetter = siteLetter;
    this.region = region;
    this.number = number;
    this.collection = collection;
    this.animal = animal;
    this.activity = activity;
    Object.freeze(this);
  }

  static fromRaw(name: string, raw: RawCardData): Card {
    // The original game displays uppercase site letters (a → A); "*" and "-" pass through unchanged.
    return new Card(
      name,
      raw.site.toUpperCase(),
      raw.region,
      raw.collection_id,
      raw.collection_type,
      raw.animal,
      raw.activity,
    );
  }

  equals(other: Card): boolean {
    return this.siteLetter === other.siteLetter;
  }
}
