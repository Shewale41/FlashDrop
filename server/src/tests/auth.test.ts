
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.ts";
import pool from "../db/index.ts";
import redisClient from "../db/redis.ts";

const email = `test-${randomUUID()}@flashdrop.test`;
const password = "TestPassword123!";
let token = "";

describe("Authentication API", () => {
  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be set for authentication tests");
    }
  });

  it("rejects registration when required fields are missing", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Name, email and password are required",
    );
  });

 it("registers a new user", async () => {
  const response = await request(app)
    .post("/auth/register")
    .send({
      name: "FlashDrop Test User",
      email,
      password,
    });

  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    name: "FlashDrop Test User",
    email,
  });
  expect(response.body).not.toHaveProperty("password_hash");
}, 15000);

  it("logs in with valid credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");

    token = response.body.user.token;
    expect(token).toEqual(expect.any(String));
  }, 15000);

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password: "WrongPassword123!" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects login for an unknown email", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: `unknown-${randomUUID()}@flashdrop.test`, password });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects access to /auth/me without a token", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authorization header missing");
  });

  it("allows access to /auth/me with a valid token", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
  });

  it("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer definitely-not-a-valid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  afterAll(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email = $1", [email]);
    } finally {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
      await pool.end();
    }
  });
});
