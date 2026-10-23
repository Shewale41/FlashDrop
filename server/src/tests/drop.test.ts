
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
import app from "../app.ts";
import pool from "../db/index.ts";
import redisClient, { connectRedis } from "../db/redis.ts";
const dropId = `test-drop-${randomUUID()}`;
const cacheKey = `flashdrop:drop:${dropId}`;

describe("Drops API", () => {
  beforeAll(async () => {
    await connectRedis();
    // Create isolated test data directly in PostgreSQL.
    await pool.query(
      `INSERT INTO drops (id, name, available_inventory)
       VALUES ($1, $2, $3)`,
      [dropId, "Test Drop", 10],
    );
  });

  
it("lists drops", async () => {
  const response = await request(app)
    .get("/drops?limit=20&offset=0");

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data.length).toBeLessThanOrEqual(20);

  expect(
    response.body.data.some(
      (drop: { id: string }) => drop.id === dropId
    )
  ).toBe(true);

  expect(response.body.pagination).toEqual({
    limit: 20,
    offset: 0,
    hasMore: expect.any(Boolean),
  });
});


  it("fetches a drop by ID", async () => {
    const response = await request(app).get(`/drops/${dropId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dropId,
      name: "Test Drop",
      available_inventory: 10,
    });
  });

  it("returns 404 for a nonexistent drop", async () => {
    const response = await request(app).get(
      `/drops/missing-${randomUUID()}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Drop doesn't exist");
  });

  it("updates a drop and invalidates its cache", async () => {
    // Prime the cache first.
    await request(app).get(`/drops/${dropId}`);

    const response = await request(app)
      .put(`/drops/${dropId}`)
      .send({
        name: "Updated Test Drop",
        availableInventory: 7,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: dropId,
      name: "Updated Test Drop",
      available_inventory: 7,
    });

    expect(await redisClient.get(cacheKey)).toBeNull();
  });

  it("returns 404 when updating a nonexistent drop", async () => {
    const response = await request(app)
      .put(`/drops/missing-${randomUUID()}`)
      .send({
        name: "Missing Drop",
        availableInventory: 5,
      });

    expect(response.status).toBe(404);
  });

  it("deletes a drop", async () => {
    const response = await request(app).delete(`/drops/${dropId}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Drop deleted successfully");

    const result = await pool.query(
      "SELECT id FROM drops WHERE id = $1",
      [dropId],
    );
    expect(result.rows).toHaveLength(0);
  });

  
it("creates a drop with valid input", async () => {
  const id = `test-create-${randomUUID()}`;

  const response = await request(app)
    .post("/drops")
    .send({
      id,
      name: "Test Creation Drop",
      availableInventory: 10,
    });

  expect(response.status).toBe(201);
  expect(response.body.id).toBe(id);
  expect(response.body.name).toBe("Test Creation Drop");
  expect(response.body.available_inventory).toBe(10);

  await pool.query("DELETE FROM drops WHERE id = $1", [id]);
});

it("rejects a missing drop ID", async () => {
  const response = await request(app)
    .post("/drops")
    .send({
      name: "Test Drop",
      availableInventory: 10,
    });

  expect(response.status).toBe(400);
});

it("rejects an empty drop name", async () => {
  const response = await request(app)
    .post("/drops")
    .send({
      id: `test-${randomUUID()}`,
      name: "   ",
      availableInventory: 10,
    });

  expect(response.status).toBe(400);
});

it("rejects negative inventory", async () => {
  const response = await request(app)
    .post("/drops")
    .send({
      id: `test-${randomUUID()}`,
      name: "Invalid Inventory Drop",
      availableInventory: -1,
    });

  expect(response.status).toBe(400);
});

it("rejects fractional inventory", async () => {
  const response = await request(app)
    .post("/drops")
    .send({
      id: `test-${randomUUID()}`,
      name: "Fractional Inventory Drop",
      availableInventory: 1.5,
    });

  expect(response.status).toBe(400);
});

it("rejects duplicate drop IDs", async () => {
  const id = `test-duplicate-${randomUUID()}`;

  const first = await request(app)
    .post("/drops")
    .send({
      id,
      name: "First Drop",
      availableInventory: 5,
    });

  expect(first.status).toBe(201);

  const second = await request(app)
    .post("/drops")
    .send({
      id,
      name: "Duplicate Drop",
      availableInventory: 5,
    });

  expect(second.status).toBe(409);

  await pool.query("DELETE FROM drops WHERE id = $1", [id]);
});


it("rejects an empty name when updating a drop", async () => {
  const response = await request(app)
    .put(`/drops/${dropId}`)
    .send({
      name: "   ",
      availableInventory: 10,
    });

  expect(response.status).toBe(400);
});

it("rejects negative inventory when updating a drop", async () => {
  const response = await request(app)
    .put(`/drops/${dropId}`)
    .send({
      name: "Valid Name",
      availableInventory: -1,
    });

  expect(response.status).toBe(400);
});

it("returns 404 when deleting a nonexistent drop", async () => {
  const response = await request(app)
    .delete(`/drops/nonexistent-${randomUUID()}`);

  expect(response.status).toBe(404);
});

it("returns 400 when updating with invalid inventory", async () => {
  const response = await request(app)
    .put(`/drops/${dropId}`)
    .send({
      name: "Valid Name",
      availableInventory: 1.5,
    });

  expect(response.status).toBe(400);
});


  
afterAll(async () => {
  await redisClient.del(cacheKey);
  await pool.query("DELETE FROM drops WHERE id = $1", [dropId]);
});

});
