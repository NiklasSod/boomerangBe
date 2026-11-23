import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

test("smoke: sanity check", () => {
  assert.equal(1 + 1, 2);
});

test("server boots and serves /health", async (t) => {
  const { httpServer, io } = createServer();

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  t.after(
    () =>
      new Promise<void>((resolve) => {
        io.close();
        httpServer.close(() => resolve());
      }),
  );

  const address = httpServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected server to bind to a TCP port");
  }

  const res = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});
