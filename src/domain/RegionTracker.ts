import type { Card } from "./Card.js";

/**
 * Tracks collected site letters per player across the game.
 * Sites and regions are scored once at game end and are NOT exclusive:
 * every player who completes a region scores its +3 bonus.
 */
export class RegionTracker {
  private readonly sitesByPlayer = new Map<number, Map<string, string>>();

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

  /** Regions from the list where the player has collected all 4 sites. */
  completedRegions(playerId: number, regions: readonly string[]): string[] {
    return regions.filter((region) => this.isRegionComplete(playerId, region));
  }
}
