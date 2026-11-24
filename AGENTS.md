# AGENTS.md — Boomerang Australia (Node.js backend)

Handoff document for agent sessions working on this repository. Read this before making changes.

## Project

A multiplayer **Boomerang: Australia** card game backend: 2–4 players connect over localhost (Socket.IO), with random bots filling seats. This is a **design exercise** — the point is not just a working game, but a clean, SOLID, human-readable architecture that is easy to extend with new rules and cards.

- **Language:** TypeScript (strict), ESM (`"type": "module"`)
- **Runtime:** Node.js >= 20 (repo dev machine: v24.13.0)
- **Stack:** Express + Socket.IO (installed), `tsx` for dev/test execution, `node:test` (no Vitest/Jest)
- **Why Express + Socket.IO:** turn-based multiplayer needs a persistent connection — Express alone (request/response) cannot push a hand or wait for a pick. Socket.IO is the Java `ServerSocket` equivalent.

## Commands

```powershell
npm run typecheck   # tsc --noEmit  (must stay clean)
npm test            # node --import tsx --test "tests/**/*.test.ts"
npm start           # tsx src/index.ts   (boots on PORT, default 3000)
npm run dev         # tsx watch src/index.ts
npm run build       # tsc -> dist/
```

## Architecture (hexagonal / ports & adapters)

Dependencies point **inward**. The core (`domain`) knows nothing about JSON files, sockets, or the console.

```
src/
  domain/       PURE MODEL + PORTS. No I/O, no framework code.
    Card.ts           immutable value object (identity = siteLetter)
    Deck.ts           Fisher–Yates shuffle via injected IRandom; draw() pops top
    Player.ts         entity: hand, draft, regionBonuses, roundScores, totalScore
    RegionTracker.ts  per-player collected sites + region-claim logic
    Scoring.ts        IScoreCategory, ScoringContext, CategoryResult (ports)
    ScoreCalculator.ts aggregates round + final categories (OCP)
    ports.ts          ICardSource, IRandom, IAgent, IMessageChannel
  rules/        (empty yet) concrete IScoreCategory implementations
  application/  (empty yet) GameEngine, RoundManager, DraftCoordinator
  adapters/     concrete implementations of the ports
    JsonCardSource.ts ICardSource (reads src/cards/australia/cards.json)
    SeededRandom.ts   IRandom (mulberry32, deterministic)
    ConsoleChannel.ts IMessageChannel (stdin/stdout)
    HumanAgent.ts     IAgent (prompts via IMessageChannel)
    RandomBotAgent.ts IAgent (uniform random via IRandom)
  net/          (empty yet) SocketChannel + socket server/client
  cards/australia/cards.json   28 sites, 7 regions x 4 sites
  index.ts      entry point (boots the server)
  server.ts     createServer() factory (Express + Socket.IO, no listen)
tests/          mirrors src/, uses node:test + node:assert/strict
```

### SOLID mapping (keep this intact)

| Principle | Where |
|---|---|
| **S** | One class per concern. The old Java `roundScore()` (~120 lines) is the anti-pattern — it becomes 4+ small rule classes. |
| **O** | `IScoreCategory` + `ScoreCalculator` and `IAgent` + `DraftCoordinator` are closed for modification, open for extension. |
| **L** | `HumanAgent` and `RandomBotAgent` are interchangeable behind `IAgent`. |
| **I** | Narrow ports: `IAgent`, `IMessageChannel`, `ICardSource`, `IRandom`, `IScoreCategory`. |
| **D** | `Deck` depends on `IRandom`, `Player` depends on nothing but domain types; adapters implement ports. |

### Human readability rules

- Small, focused classes with clear names; no god classes.
- Comments only where code needs clarification — do not narrate the obvious.
- Tests double as documentation of each rule's behavior.
- No `any`; use strict typing and `import type` for type-only imports.

## Game rules (authoritative — do not regress these)

**Deck:** 28 cards = 7 regions × 4 sites. `collection_id` in JSON maps to `Card.number` (1–7).

**Deal & draft (each of 4 rounds):** shuffle, deal 7 cards each (unused cards stay in deck), then:
- **6 picks pass clockwise** (next player), each player keeping 1 card per pick.
- The **7th card (catch card)** is the final card received and is added to the draft.
- Direction should be a **parameter** (`"clockwise" | "anticlockwise"`) so flipping the whole game is a one-line change.

**Scoring timing:**

| Stage | Rule |
|---|---|
| Every round | Throw & Catch, Collections, Animals, Activities, **Region bonus** |
| End of round 4 | **Sites** (1 pt per unique site collected) |

- **Throw & Catch:** `|first card number − last card number|` each round.
- **Collections:** count per type; `n < 8 ? n*2 : n` (from original Java — verify against the assignment).
- **Animals (pairs only, exactly 2):** Kangaroos 3, Emus 4, Wombats 5, Koalas 7, Platypuses 9.
- **Activities:** at most **one per round**, score table by count `[0,2,4,7,10,15]` for 1..6; never re-score the same activity.
- **Region bonus (per-round, locked):** every player completing an *unclaimed* region in the **same round** gets +3; the region is then locked and scores nothing in future rounds. Multiple same-round completers all score.
- **Sites (end of game):** 1 point per unique site; max 28. Combined sites + regions max = 49.

**Bugs fixed from the original Java** (do not reintroduce):
- Region names were typo'd (`"Wester Australia"`, `"New South Whales"`) — derive correct names from the cards.
- Region bonus was "first player in order only" — correct rule is "all same-round completers, then lock".

## Progress

### Done (committed on branch `dev`)

1. Scaffold: TypeScript + Express + Socket.IO + node:test smoke test.
2. `Card` value object (`fromRaw` maps JSON, uppercases site letters).
3. Ports: `ports.ts` + `Scoring.ts` (`IScoreCategory`, `ScoringContext`, `CategoryResult`).
4. `Deck` (injectable `IRandom` shuffle, `draw`).
5. `JsonCardSource` (loads + validates 28 cards / 7×4 regions).
6. `SeededRandom` (mulberry32).
7. `ConsoleChannel` (stdin/stdout `IMessageChannel`).
8. `HumanAgent` + `RandomBotAgent`.
9. `Player` entity.
10. `RegionTracker` (per-player sites + per-round region claim).
11. `ScoreCalculator` (`scoreRound`/`scoreFinal`).

All 40 tests green; `tsc --noEmit` clean.

### Remaining (next steps in order)

12. `ThrowAndCatchScorer` (round) + `SitesScorer` (final).
13. `CollectionsScorer` + `AnimalsScorer` (round).
14. `ActivitiesScorer` (round) — note: the "which activity to score" *prompt* lives in orchestration, not in the rule (rules stay pure).
15. `createScoreCalculator()` factory + end-to-end scoring test on a fixed draft.
16. `DraftCoordinator` — concurrent picks via `Promise.all`, direction parameter, 6 picks one way + 7th card the other way.
17. `RoundManager` — draft → record sites → region bonuses → score, per round.
18. `GameEngine` — 4 rounds, deal 7, reshuffle each round, totals + winner.
19. CLI entry — parse `numPlayers numBots` (server) / `IP` (client); wire local human + bots.
20. `SocketChannel` + socket server/client for remote players (Socket.IO).
21. README with Mermaid diagrams + SOLID/Booch rationale.
22. CI + final lint/type/test gate.

## Conventions

- **ESM imports use the `.js` extension** even for `.ts` files: `import { Card } from "./Card.js";`
- `import type` for type-only imports (required by `verbatimModuleSyntax`).
- Tests: `node:test` + `node:assert/strict`; one test file per class under `tests/<layer>/<Class>.test.ts`.
- Commits: Conventional Commits (`feat(domain): ...`), and end with:

```
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

- **Workflow:** the human commits each step after verifying. Write code + tests, run `npm run typecheck` and `npm test`, report results, and leave the commit to the user unless asked to commit.
