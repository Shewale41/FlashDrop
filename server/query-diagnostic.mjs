
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  query_timeout: 10000,
});

try {
  console.time("connect");
  const client = await pool.connect();
  console.timeEnd("connect");

  try {
    console.time("select");

    const result = await client.query(
  "SELECT * FROM drops LIMIT 5"
);

    console.timeEnd("select");
    console.log("Rows returned:", result.rowCount);
    console.log(result.rows);
  } finally {
    client.release();
  }
} catch (error) {
  console.error("DIAGNOSTIC FAILED:", error);
} finally {
  await pool.end();
}
