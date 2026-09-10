import "dotenv/config";
import pool from "./index.ts";
import { randomUUID } from "node:crypto";

const client = await pool.connect();

try {
 
  await client.query("BEGIN");

   const connectionInfo = await client.query(`
  SELECT pg_backend_pid();
`);

console.log("Connection PID:", connectionInfo.rows[0]);
  

  const result = await client.query(
    `UPDATE drops
     SET available_inventory = available_inventory - 1
     WHERE id = 'drop_1'
     RETURNING *`
  );

  console.log("After update:", result.rows[0]);

  // Deliberately cause an error
  await client.query(`
    INSERT INTO reservations (id, user_id, drop_id)
    VALUES ('test-id', 'does-not-exist', 'drop_1')
  `);

  await client.query("COMMIT");

} catch (error) {
  console.error("Transaction failed:", error);

  await client.query("ROLLBACK");

} finally {
  client.release();
  await pool.end();
}