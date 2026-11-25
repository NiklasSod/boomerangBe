import { parseCliArgs, runLocalGame } from "./cli.js";
import { runClient } from "./net/socketClient.js";
import { startGameServer } from "./net/GameServer.js";

const PORT = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));

  if (cli.mode === "help") {
    console.log(cli.message);
    return;
  }
  if (cli.mode === "client") {
    await runClient(cli.ip, PORT);
    return;
  }

  try {
    if (cli.numPlayers === 1) {
      await runLocalGame(cli.numPlayers, cli.numBots, cli.seed);
    } else {
      await startGameServer({
        port: PORT,
        numPlayers: cli.numPlayers,
        numBots: cli.numBots,
        seed: cli.seed,
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main();
