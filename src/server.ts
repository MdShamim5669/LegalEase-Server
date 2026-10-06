import app from "./app";
import env from "./app/config/env";
import prisma from "./app/lib/prisma";
import { initScheduledJobs } from "./app/jobs";

const server = app.listen(env.PORT, () => {
  console.log(`[LegalEase Server] Running on http://localhost:${env.PORT}`);
  console.log(`[Environment] Mode: ${env.NODE_ENV}`);
  initScheduledJobs();
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down server gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("[Prisma] Disconnected cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("[Shutdown Error]", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
