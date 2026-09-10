import "dotenv/config";
import pool from "./index.ts";

const client = await pool.connect();

try {
  await client.query("BEGIN");

  console.log("B: transaction started");

  const result = await client.query(`
  SELECT available_inventory
  FROM drops
  WHERE id = 'drop_1'
`);

console.log("B: inventory =", result.rows[0].available_inventory);

console.log("B: attempting update...");

await client.query(`
  UPDATE drops
  SET available_inventory = available_inventory - 1
  WHERE id = 'drop_1'
`);

console.log("B: update finished");
} catch (error) {
  console.error("B:", error);
} finally {
  client.release();
  await pool.end();
}