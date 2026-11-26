# Boomerang: Australia — Node.js backend

A multiplayer **draft-and-write** card game for 2-4 players, built with
TypeScript, Express, and Socket.IO.

## Requirements

- Node.js >= 20
- npm

## Setup

```powershell
npm install
```

## Commands

```powershell
npm run typecheck   # tsc --noEmit
npm test            # node --import tsx --test "tests/**/*.test.ts"
npm run build       # tsc -> dist/
# cardSet is only "australia" for now and both seed and cardSet are optional
npm start -- <numPlayers> <numBots> [seed] [cardSet]
npm start -- <IP>   # for other human player connecting
npm run dev         # tsx watch src/index.ts
```

## Running a game

The CLI mirrors the original Java entry point:

```powershell
# Local game: 1 human on the console + 2 bots
npm start -- 1 2

# Server hosting 1 local human + 1 remote human + 1 bot
npm start -- 2 1

# Remote client (connects to a server; PORT env, default 3000)
npm start -- 127.0.0.1
```

`numPlayers` is the number of **human** players (including the local one),
`numBots` is the number of bots, and the total must be 2-4. The optional
`seed` makes a game reproducible; when omitted the game starts from a random
seed. The optional `cardSet` picks the deck + scoring values (default
`australia`).

## Card sets

A card set is one config object in [src/cards](src/cards/) — its JSON deck,
region size, and the collection/animal point values. To add **Boomerang USA**:

1. Add `src/cards/usa/cards.json` (same shape as the Australia file).
2. Add `src/cards/usa.ts` exporting a `CardSetConfig`.
3. Register it in the `CARD_SETS` map in [src/cards/cardSets.ts](src/cards/cardSets.ts).

No rule, orchestration, or engine changes are needed — the scorers receive
the value tables through their constructors.

## Architecture (hexagonal / ports & adapters)

Dependencies point **inward**. The domain layer has no imports from the
outside world; adapters and the network layer implement the domain's ports.

```
src/
  domain/        pure model + ports (no I/O, no framework code)
  rules/         concrete IScoreCategory implementations
  cards/         card set configs + JSON decks (australia, usa, ...)
  application/   DraftCoordinator, RoundManager, GameEngine
  adapters/      implementations of the ports
  net/           Socket.IO channel, client, and game server
  cli.ts         argument parsing + local game wiring
  index.ts       entry point
  server.ts      createServer() factory (Express + Socket.IO)
tests/           mirrors src/
```

## Scoring rules

Easiest: Google - "Boomerang australia card game rules"
It this repository I made it easy to change the rules.

## Tests

`npm test` runs the suite (currently 92 tests) with `node:test`. Tests mirror
`src/` and double as documentation of each rule's behaviour, covering the
domain model, every scorer, the draft direction options, the round and game
orchestration, the CLI parser, and the Socket.IO channel protocol.
