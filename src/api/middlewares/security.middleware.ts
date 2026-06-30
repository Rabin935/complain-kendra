import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

const BLOCKED_KEY_PATTERN = /(^\$)|(\.)/;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (BLOCKED_KEY_PATTERN.test(key)) {
      continue;
    }

    sanitized[key] = sanitizeValue(nestedValue);
  }

  return sanitized;
}

export function sanitizeRequest(request: Request, _response: Response, next: NextFunction): void {
  // Strip Mongo operator-style keys before controllers build database queries from request input.
  request.body = sanitizeValue(request.body) as Request["body"];
  request.query = sanitizeValue(request.query) as Request["query"];
  request.params = sanitizeValue(request.params) as Request["params"];
  next();
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT ?? 500),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please wait a moment and try again.",
  },
});
