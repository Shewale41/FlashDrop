import { Router } from "express";
import type { Drop } from "../types/drop.ts";
import pool from "../db/index.ts";

const router = Router();

// const drops: Drop[] = [
//   {
//     id: "drop_1",
//     name: "Limited Sneakers",
//     availableInventory: 500,
//   },
//   {
//     id: "drop_2",
//     name: "Gaming Console",
//     availableInventory: 100,
//   },
//   {
//     id: "drop_3",
//     name: "Collector Edition",
//     availableInventory: 50,
//   },
// ];

router.get("/", async (_req, res) => {
  const result = await pool.query("SELECT * FROM drops");
  res.json(result.rows);
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const result = await pool.query(
    "SELECT * FROM drops WHERE id = $1",
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({
      message: "Drop doesn't exist",
    });
    return;
  }

  res.json(result.rows[0]);
});

router.post("/", async (req, res) => {
  const { id, name, availableInventory } = req.body;

  const addedRow = await pool.query(
    `INSERT INTO drops (id, name, available_inventory)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, name, availableInventory]
  );

  console.log(addedRow);

  return res.status(201).json(addedRow.rows[0]);
});

export default router;