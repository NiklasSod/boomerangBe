import { createServer as createHttpServer } from "node:http";
import type { Server as HttpServer } from "node:http";
import express from "express";
import type { Express } from "express";
import { Server as SocketServer } from "socket.io";

export interface GameServer {
  app: Express;
  httpServer: HttpServer;
  io: SocketServer;
}

export function createServer(): GameServer {
  const app: Express = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", game: "Boomerang Australia" });
  });

  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer);

  io.on("connection", (socket) => {
    console.log(`[server] client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[server] client disconnected: ${socket.id}`);
    });
  });

  return { app, httpServer, io };
}
