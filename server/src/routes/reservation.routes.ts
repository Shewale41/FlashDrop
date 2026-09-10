import { Router } from "express";
import pool from "../db/index.ts";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middleware/auth.middleware.ts";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
      const { dropId } = req.body;
      if (!req.user) {
          return res.status(401).json({
              message: "Not authenticated",
          });
        }

    const { userId } = req.user;

    if (!dropId || !userId) {
      return res.status(400).json({
        message: "Drop ID is required",
      });
    }

    const dropData = await pool.query(
      `SELECT *
       FROM drops
       WHERE id = $1`,
      [dropId]
    );

    if (dropData.rows.length === 0) {
      return res.status(404).json({
        message: "Drop not found",
      });
    }

    const drop = dropData.rows[0];

    if (drop.available_inventory <= 0) {
      return res.status(409).json({
        message: "Drop is sold out",
      });
    }

    const reservationId = randomUUID();

    const reservation = await pool.query(
      `INSERT INTO reservations (id, user_id, drop_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reservationId, userId, dropId]
    );

    await pool.query(
      `UPDATE drops
       SET available_inventory = available_inventory - 1
       WHERE id = $1`,
      [dropId]
    );

    return res.status(201).json({
      message: "Reservation successful",
      reservation: reservation.rows[0],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
    

export default router;