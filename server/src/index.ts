import { env } from "./config/env.js";
import { dbMode, initDb, prisma } from "./config/prisma.js";
import { createApp } from "./app.js";

await initDb();

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Training portal API listening on port ${env.PORT} (${dbMode})`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
