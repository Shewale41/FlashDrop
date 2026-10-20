
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

const userId = randomUUID();
const email = `reservation-test-${randomUUID()}@example.com`;

const successDropId = `test-res-${randomUUID()}`;
const duplicateDropId = `test-res-${randomUUID()}`;
const soldOutDropId = `test-res-${randomUUID()}`;

const dropIds = [
  successDropId,
  duplicateDropId,
  soldOutDropId,
];

const token = jwt.sign(
  { userId, email },
  process.env.JWT_SECRET!,
  { expiresIn: "15m" }
);

const authHeader = `Bearer ${token}`;

describe("Reservations API", () => {
  beforeAll(async () => {
    // Create a test user directly in PostgreSQL.
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [userId, "Reservation Test User", email, "test-hash"]
    );

    // Prepare independent drops for our tests.
    await pool.query(
      `INSERT INTO drops (id, name, available_inventory)
       VALUES
         ($1, 'Reservation Success Test', 5),
         ($2, 'Duplicate Reservation Test', 5),
         ($3, 'Sold Out Reservation Test', 0)`,
      dropIds
    );
  }, 30000);

  afterAll(async () => {
    // Delete dependent records before their parent records.
    await pool.query(
      "DELETE FROM reservations WHERE user_id = $1",
      [userId]
    );

    await pool.query(
      "DELETE FROM drops WHERE id = ANY($1::text[])",
      [dropIds]
    );

    await pool.query(
      "DELETE FROM users WHERE id = $1",
      [userId]
    );
  }, 30000);

  it("rejects a reservation without authentication", async () => {
    const response = await request(app)
      .post("/reservations")
      .send({ dropId: successDropId });

    expect(response.status).toBe(401);
  });

  it("rejects a request without a drop ID", async () => {
    const response = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Drop ID is required");
  });

  it("creates a reservation and decrements inventory", async () => {
    const response = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({ dropId: successDropId });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Reservation successful");
    expect(response.body.reservation.drop_id).toBe(successDropId);
    expect(response.body.reservation.user_id).toBe(userId);

    const result = await pool.query(
      "SELECT available_inventory FROM drops WHERE id = $1",
      [successDropId]
    );

    expect(result.rows[0].available_inventory).toBe(4);
  });

  it("returns 404 when the drop does not exist", async () => {
    const response = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({ dropId: `missing-${randomUUID()}` });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Drop not found");
  });

  it("rejects reservations for sold-out drops", async () => {
    const response = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({ dropId: soldOutDropId });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Drop is sold out");

    const result = await pool.query(
      "SELECT available_inventory FROM drops WHERE id = $1",
      [soldOutDropId]
    );

    expect(result.rows[0].available_inventory).toBe(0);
  });

  it("rejects a duplicate reservation without decrementing inventory again", async () => {
    const firstResponse = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({ dropId: duplicateDropId });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/reservations")
      .set("Authorization", authHeader)
      .send({ dropId: duplicateDropId });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toBe(
      "You have already reserved this drop"
    );

    const result = await pool.query(
      "SELECT available_inventory FROM drops WHERE id = $1",
      [duplicateDropId]
    );

    expect(result.rows[0].available_inventory).toBe(4);

    const reservations = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM reservations
       WHERE user_id = $1 AND drop_id = $2`,
      [userId, duplicateDropId]
    );

    expect(reservations.rows[0].count).toBe(1);
  });
});
