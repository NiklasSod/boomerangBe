import type { Card } from "./Card.js";

export interface RegionBonus {
  readonly playerId: number;
  readonly region: string;
}

/**
 * Tracks collected site letters per player and which regions have already
 * been claimed, so the +3 first-completer bonus is awarded exactly once.
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
   * Awards the +3 bonus to the first player (in playerOrder) to complete
   * each region, exactly once per region. Returns the awarded bonuses.
   */
  awardFirstCompletions(
    regions: readonly string[],
    playerOrder: readonly number[],
  ): RegionBonus[] {
    const bonuses: RegionBonus[] = [];
    for (const region of regions) {
      if (this.claimedRegions.has(region)) {
        continue;
      }
      for (const playerId of playerOrder) {
        if (this.isRegionComplete(playerId, region)) {
          this.claimedRegions.add(region);
          bonuses.push({ playerId, region });
          break;
        }
      }
    }
    return bonuses;
  }

  get claimed(): ReadonlySet<string> {
    return this.claimedRegions;
  }
}
