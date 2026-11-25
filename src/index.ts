import { parseCliArgs, runLocalGame } from "./cli.js";

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));

  if (cli.mode === "help") {
    console.log(cli.message);
    return;
  }
  if (cli.mode === "client") {
    console.log(
      `Client mode for ${cli.ip} arrives with the socket client (step 20).`,
    );
    return;
  }

  try {
    await runLocalGame(cli.numPlayers, cli.numBots, cli.seed);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main();
