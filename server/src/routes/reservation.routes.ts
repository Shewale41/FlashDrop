import { Router } from "express";
import pool from "../db/index.ts";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  const client = await pool.connect();

  try {
    const { dropId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const { userId } = req.user;

    if (!dropId) {
      return res.status(400).json({
        message: "Drop ID is required",
      });
    }

    // Start transaction
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

    // Check inventory while holding the row lock
    if (drop.available_inventory <= 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Drop is sold out",
      });
    }

    const reservationId = randomUUID();

    // Create reservation
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

    // Everything succeeded
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Reservation successful",
      reservation: reservation.rows[0],
    });
  } catch (error) {
    console.error(error);

    // Undo everything if anything failed
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Something went wrong",
    });
  } finally {
    // Return connection to pool
    client.release();
  }
});
    

export default router;