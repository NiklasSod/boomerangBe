import type { Socket } from "socket.io";
import type { IMessageChannel } from "../domain/ports.js";

export const DISPLAY_EVENT = "display";
export const REQUEST_INPUT_EVENT = "request-input";
export const INPUT_EVENT = "input";

/**
 * IMessageChannel over a Socket.IO socket (server side). send() emits a
 * "display" event to the remote client; read() asks the client for a line
 * and resolves with the client's "input" reply.
 */
export class SocketChannel implements IMessageChannel {
  constructor(private readonly socket: Socket) {}

  async send(message: unknown): Promise<void> {
    this.socket.emit(DISPLAY_EVENT, message);
  }

  read(): Promise<string> {
    this.socket.emit(REQUEST_INPUT_EVENT);
    return new Promise<string>((resolve) => {
      this.socket.once(INPUT_EVENT, (text: unknown) => resolve(String(text)));
    });
  }

  close(): void {
    this.socket.disconnect(true);
  }
}
