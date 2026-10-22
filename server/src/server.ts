
import "dotenv/config";
import app from "./app.ts";
import pool from "./db/index.ts";
import redisClient, { connectRedis } from "./db/redis.ts";
import type { Server } from "node:http";

const PORT = Number(process.env.PORT) || 3000;

let server: Server | undefined;
let shuttingDown = false;

async function startServer() {
  try {
    await connectRedis();
    console.log("Redis connected");
  } catch (error) {
    console.error("Redis unavailable at startup:", error);
  }

  server = app.listen(PORT, () => {
    console.log(`FlashDrop API running on http://localhost:${PORT}`);
  });
}



async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down FlashDrop...`);

  try {
    if (server) {
      console.log("Closing HTTP server...");

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn("HTTP shutdown timed out; closing remaining connections.");
          server!.closeAllConnections();
        }, 5000);

        server!.close((error) => {
          clearTimeout(timeout);

          if (error) {
            reject(error);
          } else {
            console.log("HTTP server closed");
            resolve();
          }
        });

        server!.closeIdleConnections();
      });
    }

    console.log("Closing PostgreSQL pool...");
    await pool.end();
    console.log("PostgreSQL pool closed");

    if (redisClient.isOpen) {
      console.log("Closing Redis client...");
      await redisClient.quit();
      console.log("Redis client closed");
    } else {
      console.log("Redis client already closed");
    }

    console.log("Graceful shutdown complete");
    process.exitCode = 0;
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exitCode = 1;
  }
}



process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

startServer();
