import { Router } from "express";
import type { Drop } from "../types/drop.ts";
import pool from "../db/index.ts";
import redisClient from "../db/redis.ts";

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




router.get("/", async (req, res) => {

//   const requestStartedAt = performance.now();

// res.on("finish", () => {
//   console.log(
//     `GET /drops total: ${(
//       performance.now() - requestStartedAt
//     ).toFixed(2)} ms | status: ${res.statusCode}`
//   );
// });  //code above this is for tesing the time of the api okei

  const limitParam = req.query.limit;
  const offsetParam = req.query.offset;

  const requestedLimit =
    typeof limitParam === "string" ? Number(limitParam) : 20;

  const offset =
    typeof offsetParam === "string" ? Number(offsetParam) : 0;

  if (
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    return res.status(400).json({
      message: "limit must be a positive integer and offset must be a non-negative integer",
    });
  }

  // Cap page size to prevent excessively large responses.
  const limit = Math.min(requestedLimit, 100);

  try {
    // console.time("GET /drops DB query"); //JUST FOR THE TESTING purpose of the k6 and testing the time before

const result = await pool.query(
  `SELECT * FROM drops
   ORDER BY id
   LIMIT $1 OFFSET $2`,
  [limit + 1, offset]
);

// console.timeEnd("GET /drops DB query"); //just for the testing purpose , testing the time after

    // Fetch one extra row to determine whether another page exists.
    const hasMore = result.rows.length > limit;
    const drops = hasMore ? result.rows.slice(0, limit) : result.rows;

    return res.status(200).json({
      data: drops,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Failed to fetch drops:", error);
    return res.status(500).json({
      message: "Failed to fetch drops",
    });
  }
});





router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `flashdrop:drop:${id}`;

  // 1. Try Redis first.
  try {
    const cachedDrop = await redisClient.get(cacheKey);

    if (cachedDrop !== null) {
      console.log("CACHE HIT:", cacheKey);
      return res.json(JSON.parse(cachedDrop));
    }
  } catch (error) {
    // Redis is unavailable: continue to PostgreSQL.
    console.error("Redis GET failed:", error);
  }

  // 2. Cache miss (or Redis failure): query PostgreSQL.
  try {
    console.log("CACHE MISS:", cacheKey);

    const result = await pool.query(
      "SELECT * FROM drops WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Drop doesn't exist",
      });
    }

    const drop = result.rows[0];

    // 3. Populate Redis, but don't fail the request if caching fails.
    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(drop),
        { EX: 30 }
      );
    } catch (error) {
      console.error("Redis SET failed:", error);
    }

    return res.json(drop);
  } catch (error) {
    console.error("Failed to fetch drop:", error);

    return res.status(500).json({
      message: "Failed to fetch drop",
    });
  }
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

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, availableInventory } = req.body;

  try {
    const updatedRow = await pool.query(
      `UPDATE drops
       SET name = $1,
           available_inventory = $2
       WHERE id = $3
       RETURNING *`,
      [name, availableInventory, id]
    );

    if (updatedRow.rows.length === 0) {
      return res.status(404).json({
        message: "Drop not found",
      });
    }

    const updatedDrop = updatedRow.rows[0];
    const cacheKey = `flashdrop:drop:${id}`;

    // Invalidate the cache after PostgreSQL succeeds.
    try {
      await redisClient.del(cacheKey);
      console.log("CACHE INVALIDATED:", cacheKey);
    } catch (error) {
      // The database update succeeded, so don't misreport it as failed.
      console.error("Cache invalidation failed:", error);
    }

    return res.status(200).json(updatedDrop);
  } catch (error) {
    console.error("Failed to update drop:", error);

    return res.status(500).json({
      message: "Failed to update drop",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  const deletedRow = await pool.query(
    "DELETE FROM drops WHERE id = $1 RETURNING *",
    [id]
  );

  if (deletedRow.rows.length === 0) {
    return res.status(404).json({
      message: "Drop not found",
    });
  }

  res.status(200).json({
    message: "Drop deleted successfully",
    drop: deletedRow.rows[0],
  });
});

export default router;