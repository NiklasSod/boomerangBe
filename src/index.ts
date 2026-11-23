import { createServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);
const { httpServer } = createServer();

httpServer.listen(PORT, () => {
  console.log(`Boomerang Australia server listening on http://localhost:${PORT}`);
});
