import "dotenv/config";
import pool from "./index.ts";
import redisClient from "./redis.ts";


const cacheKey = "flashdrop:drop_9999";

try {
  // 1. Check Redis first
  const cache = await redisClient.get(cacheKey);

  if (cache !== null) {
    console.log("CACHE HIT");
    console.log("Value:", JSON.parse(cache));
  } else {
    console.log("CACHE MISS");

    // 2. Fetch from PostgreSQL
    const dbValue = await pool.query(
      `SELECT *
       FROM drops
       WHERE id = $1`,
      ["drop_1"]
    );

    if (dbValue.rows.length === 0) {
      console.log("Drop not found");
      process.exit(0);
    }

    const drop = dbValue.rows[0];

    console.log("DB value:", drop);

    // 3. Store PostgreSQL result in Redis
    await redisClient.set(
      cacheKey,
      JSON.stringify(drop),
      {
        EX: 50,
      }
    );

    console.log("Cached in Redis");
  }
} catch (error) {
  console.error("Something went wrong:", error);
} finally {
  await redisClient.quit();
  await pool.end();
}