import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonCardSource } from "../../src/adapters/JsonCardSource.js";

const realCardsUrl = new URL(
  "../../src/cards/australia/cards.json",
  import.meta.url,
);

test("loads the real Australian deck: 28 cards across 7 regions x 4", async () => {
  const cards = await new JsonCardSource(realCardsUrl).load();

  assert.equal(cards.length, 28);

  const byRegion = new Map<string, number>();
  for (const c of cards) {
    byRegion.set(c.region, (byRegion.get(c.region) ?? 0) + 1);
  }

  assert.equal(byRegion.size, 7);
  for (const [, count] of byRegion) {
    assert.equal(count, 4);
  }
});

test("rejects a region with fewer than 4 cards", async (t) => {
  const file = await writeFixture(t, {
    A: { site: "a", region: "Western Australia", collection_id: 1, collection_type: null, animal: null, activity: null },
    B: { site: "b", region: "Western Australia", collection_id: 1, collection_type: null, animal: null, activity: null },
  });

  const source = new JsonCardSource(file);
  await assert.rejects(() => source.load(), /Western Australia.*expected 4/i);
});

test("rejects duplicate site letters", async (t) => {
  const file = await writeFixture(t, {
    A: { site: "a", region: "R", collection_id: 1, collection_type: null, animal: null, activity: null },
    B: { site: "a", region: "R", collection_id: 1, collection_type: null, animal: null, activity: null },
  });

  const source = new JsonCardSource(file);
  await assert.rejects(() => source.load(), /duplicate site letter/i);
});

async function writeFixture(
  t: { after: (fn: () => unknown) => void },
  data: object,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "boomerang-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "cards.json");
  await writeFile(file, JSON.stringify(data));
  return file;
}
