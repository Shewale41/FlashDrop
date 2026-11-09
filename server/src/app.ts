
import express from "express";
import dropRoutes from "./routes/drop.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import reservationRoutes from "./routes/reservation.routes.ts";
import { rateLimit } from "./middleware/rateLimit.ts";
import pool from "./db/index.ts";
import redisClient from "./db/redis.ts";

const app = express();

app.use(express.json());

app.use("/drops", rateLimit, dropRoutes);
app.use("/auth", authRoutes);
app.use("/reservations", reservationRoutes);

// Liveness: Is the Node.js process responding?
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Readiness: Can the API access its required database?
app.get("/ready", async (_req, res) => {
  let database = "connected";
  let redis = redisClient.isReady ? "connected" : "unavailable";

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ready",
      services: {
        database,
        redis,
      },
    });
  } catch (error) {
    console.error("Readiness check failed:", error);

    database = "unavailable";

    return res.status(503).json({
      status: "not_ready",
      services: {
        database,
        redis,
      },
    });
  }
});

export default app;
