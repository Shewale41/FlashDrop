
import { Router } from "express";
import pool from "../db/index.ts";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middleware/auth.middleware.ts";
import redisClient from "../db/redis.ts";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  const { dropId } = req.body;

  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  if (typeof dropId !== "string" || !dropId.trim()) {
    return res.status(400).json({
      message: "Drop ID is required",
    });
  }

  const { userId } = req.user;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lock the drop row
      const dropData = await client.query(
        `SELECT *
         FROM drops
         WHERE id = $1
         FOR UPDATE`,
        [dropId]
      );

      if (dropData.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Drop not found",
        });
      }

      const drop = dropData.rows[0];

      if (drop.available_inventory <= 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Drop is sold out",
        });
      }

      const reservationId = randomUUID();

      const reservation = await client.query(
        `INSERT INTO reservations (id, user_id, drop_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [reservationId, userId, dropId]
      );

      // Decrease inventory
      await client.query(
        `UPDATE drops
         SET available_inventory = available_inventory - 1
         WHERE id = $1`,
        [dropId]
      );

      await client.query("COMMIT");

      // Invalidate cache after successful commit
      const cacheKey = `flashdrop:drop:${dropId}`;

      try {
        await redisClient.del(cacheKey);
        console.log("CACHE INVALIDATED:", cacheKey);
      } catch (cacheError) {
        console.error(
          "Reservation committed, but cache invalidation failed:",
          cacheError
        );
      }

      return res.status(201).json({
        message: "Reservation successful",
        reservation: reservation.rows[0],
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transaction rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return res.status(409).json({
        message: "You have already reserved this drop",
      });
    }

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;
