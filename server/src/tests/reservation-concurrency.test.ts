
import "dotenv/config";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import app from "../app.ts";
import pool from "../db/index.ts";

const userIds = Array.from({ length: 10 }, () => randomUUID());
const emails = userIds.map(
  (id) => `concurrency-${id}@example.com`
);
const dropId = `test-concurrency-${randomUUID()}`;
const inventory = 3;

const tokens = userIds.map((userId, index) =>
  jwt.sign(
    { userId, email: emails[index] },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  )
);

describe("Reservation concurrency", () => {
  beforeAll(async () => {
    for (let i = 0; i < userIds.length; i++) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [userIds[i], `Concurrency User ${i}`, emails[i], "test-hash"]
      );
    }

    await pool.query(
      `INSERT INTO drops (id, name, available_inventory)
       VALUES ($1, $2, $3)`,
      [dropId, "Concurrency Test Drop", inventory]
    );
  }, 60000);

  afterAll(async () => {
    await pool.query(
      "DELETE FROM reservations WHERE user_id = ANY($1::text[])",
      [userIds]
    );

    await pool.query("DELETE FROM drops WHERE id = $1", [dropId]);

    await pool.query(
      "DELETE FROM users WHERE id = ANY($1::text[])",
      [userIds]
    );
  }, 60000);

  it("never oversells inventory under concurrent requests", async () => {
    const responses = await Promise.all(
      tokens.map((token) =>
        request(app)
          .post("/reservations")
          .set("Authorization", `Bearer ${token}`)
          .send({ dropId })
      )
    );

    const successful = responses.filter(
      (response) => response.status === 201
    );
    const rejected = responses.filter(
      (response) => response.status === 409
    );

    expect(successful).toHaveLength(inventory);
    expect(rejected).toHaveLength(userIds.length - inventory);

    const dropResult = await pool.query(
      "SELECT available_inventory FROM drops WHERE id = $1",
      [dropId]
    );

    expect(dropResult.rows[0].available_inventory).toBe(0);

    const reservationResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM reservations WHERE drop_id = $1",
      [dropId]
    );

    expect(reservationResult.rows[0].count).toBe(inventory);
  }, 90000);
});
