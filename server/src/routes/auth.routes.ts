import { Router } from "express";
import bcrypt from 'bcrypt';
import pool from "../db/index.ts";
import { randomUUID } from "node:crypto";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const id = randomUUID();

  const hashPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, name, email, hashPassword]
  );

  return res.status(201).json({
    id: result.rows[0].id,
    name: result.rows[0].name,
    email: result.rows[0].email,
  });
});


export default router;