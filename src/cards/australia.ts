import { JsonCardSource } from "../adapters/JsonCardSource.js";
import type { CardSetConfig } from "./cardSets.js";

/** Boomerang: Australia — 7 regions x 4 sites, 28 cards. */
export const australiaConfig: CardSetConfig = {
  name: "australia",
  cardSource: new JsonCardSource(
    new URL("./australia/cards.json", import.meta.url),
    4,
  ),
  sitesPerRegion: 4,
  collectionValues: new Map([
    ["Leaves", 1],
    ["Wildflowers", 2],
    ["Shells", 3],
    ["Souvenirs", 5],
  ]),
  animalValues: new Map([
    ["Kangaroos", 3],
    ["Emus", 4],
    ["Wombats", 5],
    ["Koalas", 7],
    ["Platypuses", 9],
  ]),
};
