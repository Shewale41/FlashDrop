
import "dotenv/config";
import app from "./app.ts";
import { connectRedis } from "./db/redis.ts";

const PORT = 3000;

async function startServer() {
  try {
    await connectRedis();
    console.log("Redis connected");
  } catch (error) {
    // Redis is optional for startup; routes should handle its absence.
    console.error("Redis unavailable at startup:", error);
  }

  app.listen(PORT, () => {
    console.log(`FlashDrop API running on http://localhost:${PORT}`);
  });
}

startServer();
