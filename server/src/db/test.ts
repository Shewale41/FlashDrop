import pool from "./index.ts";

const result = await pool.query("SELECT NOW()");

console.log(result.rows);

await pool.end();