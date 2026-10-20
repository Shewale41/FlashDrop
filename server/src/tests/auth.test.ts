
import "dotenv/config";
import {
  afterAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.ts";
import pool from "../db/index.ts";

const email = `test-${randomUUID()}@example.com`;
const password = "TestPassword123!";

describe("Authentication API", () => {
  it("rejects registration when fields are missing", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email });

    expect(response.status).toBe(400);
  });

  it("registers a new user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User",
        email,
        password,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(email);
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("password_hash");
  });

  it("logs in with valid credentials", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty("token");
  });

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password: "WrongPassword123!" });

    expect(response.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: `unknown-${randomUUID()}@example.com`,
        password,
      });

    expect(response.status).toBe(401);
  });

  it("rejects access without a token", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
  });

  it("allows access with a valid token", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.user.token}`);

    expect(response.status).toBe(200);
  });

  it("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
});
