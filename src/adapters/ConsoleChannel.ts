import { createInterface } from "node:readline/promises";
import type { IMessageChannel } from "../domain/ports.js";

/** IMessageChannel over the process console (stdin/stdout). */
export class ConsoleChannel implements IMessageChannel {
  private readonly rl: ReturnType<typeof createInterface>;

  constructor(
    input: NodeJS.ReadableStream & { isTTY?: boolean } = process.stdin,
    private readonly output: NodeJS.WritableStream = process.stdout,
  ) {
    this.rl = createInterface({ input, output, terminal: input.isTTY === true });
  }

  async send(message: unknown): Promise<void> {
    const text =
      typeof message === "string" ? message : (JSON.stringify(message) ?? String(message));
    this.output.write(`${text}\n`);
  }

  read(): Promise<string> {
    return this.rl.question("");
  }

  close(): void {
    this.rl.close();
  }
}
