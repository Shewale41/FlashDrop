
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  query_timeout: 10000,
});

try {
  console.time("Database connection");
  const client = await pool.connect();
  console.timeEnd("Database connection");

  try {
    console.time("Fetch 1000 rows");

    const result = await client.query("SELECT 1 AS test");

    console.timeEnd("Fetch 1000 rows");

    const sizeMB = (
      Buffer.byteLength(JSON.stringify(result.rows)) /
      (1024 * 1024)
    ).toFixed(2);

   console.log("Query result:", result.rows);
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Diagnostic failed:", error);
} finally {
  await pool.end();
}
