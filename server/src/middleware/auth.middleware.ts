
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token missing or malformed",
    });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Server authentication configuration error",
    });
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string"
    ) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
