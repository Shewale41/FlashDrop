import "dotenv/config";
import pool from "./index.ts";

const client = await pool.connect();

try {
  await client.query("BEGIN");

   await client.query("BEGIN");

const dropData = await client.query(
  `SELECT *
   FROM drops
   WHERE id = $1
   FOR UPDATE`,
  [dropId]
);

const drop = dropData.rows[0];

if (drop.available_inventory <= 0) {
  throw new Error("Sold out man")
}

await client.query(
  `INSERT INTO reservations (id, user_id, drop_id)
   VALUES ($1, $2, $3)`,
  [reservationId, userId, dropId]
);

await client.query(
  `UPDATE drops
   SET available_inventory = available_inventory - 1
   WHERE id = $1`,
  [dropId]
);

await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
} finally {
  client.release();
  console.log("409 resource conflict")
}