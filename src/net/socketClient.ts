import { io, type Socket } from "socket.io-client";
import { ConsoleChannel } from "../adapters/ConsoleChannel.js";
import type { IMessageChannel } from "../domain/ports.js";
import {
  DISPLAY_EVENT,
  INPUT_EVENT,
  REQUEST_INPUT_EVENT,
} from "./SocketChannel.js";

/**
 * Connects to a game server and relays its messages to the local console.
 * The server sends "display" messages to print and "request-input" events
 * that are answered with a line from the console.
 */
export async function runClient(
  ip: string,
  port: number,
  channel: IMessageChannel = new ConsoleChannel(),
): Promise<void> {
  const socket: Socket = io(`http://${ip}:${port}`, { reconnection: false });

  socket.on(DISPLAY_EVENT, (message: unknown) => {
    void channel.send(message);
  });
  socket.on(REQUEST_INPUT_EVENT, () => {
    void (async () => {
      const answer = await channel.read();
      socket.emit(INPUT_EVENT, answer);
    })();
  });

  await new Promise<void>((resolve) => {
    socket.on("disconnect", (reason: string) => {
      if (reason !== "io server disconnect") {
        void channel.send(`Disconnected from ${ip}:${port} (${reason})`);
      }
      channel.close();
      resolve();
    });
    socket.on("connect_error", (error: Error) => {
      void channel.send(`Could not connect to ${ip}:${port}: ${error.message}`);
      channel.close();
      resolve();
    });
  });
}
