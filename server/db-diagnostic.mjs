
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
});

const id = `flashdrop_diag_${Date.now()}`;

try {
  console.time("connect");
  const client = await pool.connect();
  console.timeEnd("connect");

  try {
    console.time("select");
    await client.query("SELECT NOW()");
    console.timeEnd("select");

    console.time("insert");

    const result = await client.query(
      `INSERT INTO drops (id, name, available_inventory)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [id, "Diagnostic Drop", 10]
    );

    console.timeEnd("insert");
    console.log("Inserted:", result.rows[0]);

    console.time("delete");
    await client.query(
      "DELETE FROM drops WHERE id = $1",
      [id]
    );
    console.timeEnd("delete");

    console.log("Diagnostic completed successfully.");
  } finally {
    client.release();
  }
} catch (error) {
  console.error("DIAGNOSTIC FAILED:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
