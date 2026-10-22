
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  query_timeout: 15000,
});

try {
  console.time("Acquire pooled connection");
  const client = await pool.connect();
  console.timeEnd("Acquire pooled connection");

  try {
    
for (let i = 1; i <= 5; i++) {
  console.time(`SELECT 1 — run ${i}`);
  await client.query("SELECT 1");
  console.timeEnd(`SELECT 1 — run ${i}`);
}


    console.time("Fetch 20 drops");
    const result = await client.query(
      "SELECT * FROM drops ORDER BY id LIMIT 20"
    );
    console.timeEnd("Fetch 20 drops");

    console.log("Rows returned:", result.rowCount);
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Diagnostic failed:", error);
} finally {
  await pool.end();
}
