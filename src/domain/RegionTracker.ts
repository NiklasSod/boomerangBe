import type { Card } from "./Card.js";

export interface RegionBonus {
  readonly playerId: number;
  readonly region: string;
}

/**
 * Tracks collected site letters per player plus which regions have already
 * been claimed. Region bonuses are a per-round rule: every player who
 * completes a region in the same round scores +3, after which the region is
 * locked for future rounds.
 */
export class RegionTracker {
  private readonly sitesByPlayer = new Map<number, Map<string, string>>();
  private readonly claimedRegions = new Set<string>();

  /** Records new site letters for a player (duplicate letters ignored). */
  recordSites(playerId: number, cards: readonly Card[]): void {
    let sites = this.sitesByPlayer.get(playerId);
    if (sites === undefined) {
      sites = new Map();
      this.sitesByPlayer.set(playerId, sites);
    }
    for (const card of cards) {
      if (!sites.has(card.siteLetter)) {
        sites.set(card.siteLetter, card.region);
      }
    }
  }

  /** Unique site letters collected by a player so far. */
  sitesFor(playerId: number): ReadonlySet<string> {
    return new Set(this.sitesByPlayer.get(playerId)?.keys() ?? []);
  }

  isRegionComplete(playerId: number, region: string): boolean {
    const sites = this.sitesByPlayer.get(playerId);
    if (sites === undefined) {
      return false;
    }
    let count = 0;
    for (const siteRegion of sites.values()) {
      if (siteRegion === region) {
        count += 1;
      }
    }
    return count === 4;
  }

  /**
   * Awards +3 to EVERY player completing an unclaimed region this round,
   * then claims the region so later rounds cannot score it again.
   */
  awardRoundBonuses(
    regions: readonly string[],
    playerOrder: readonly number[],
  ): RegionBonus[] {
    const bonuses: RegionBonus[] = [];
    for (const region of regions) {
      if (this.claimedRegions.has(region)) {
        continue;
      }
      const completers = playerOrder.filter((playerId) =>
        this.isRegionComplete(playerId, region),
      );
      if (completers.length > 0) {
        this.claimedRegions.add(region);
        for (const playerId of completers) {
          bonuses.push({ playerId, region });
        }
      }
    }
    return bonuses;
  }

  get claimed(): ReadonlySet<string> {
    return this.claimedRegions;
  }
}
