
import type { Request, Response, NextFunction } from "express";
import redisClient from "../db/redis.ts";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 20;

export async function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Identify the client making the request.
  const clientId = req.ip ?? "unknown";
  const key = `flashdrop:rate-limit:${clientId}`;

  try {
    // Atomically increment the counter and set its expiry.
    const result = await redisClient.eval(
      `
      local count = redis.call("INCR", KEYS[1])
      if count == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      return count
      `,
      {
        keys: [key],
        arguments: [String(WINDOW_SECONDS)],
      },
    );

    const requestCount = Number(result);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, MAX_REQUESTS - requestCount),
    );

    if (requestCount > MAX_REQUESTS) {
      res.setHeader("Retry-After", WINDOW_SECONDS);
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
      });
    }

    next();
  }  catch (error) {
  console.error("Rate limiter Redis error:", error);

  // Temporary fail-open behavior:
  // keep the API available when Redis is unavailable.
  return next();
}
}
