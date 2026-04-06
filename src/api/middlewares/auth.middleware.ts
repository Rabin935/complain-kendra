import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import type { JwtUserPayload } from "../types";

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in the environment.");
  }

  return jwtSecret;
}

function isJwtUserPayload(payload: string | JwtPayload): payload is JwtUserPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.userId === "string" &&
    typeof payload.email === "string" &&
    (payload.role === "user" || payload.role === "admin")
  );
}

export function protect(request: Request, response: Response, next: NextFunction): void {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    response.status(401).json({
      success: false,
      message: "Authorization token is required.",
    });
    return;
  }

  const token = authorizationHeader.split(" ")[1];

  if (!token) {
    response.status(401).json({
      success: false,
      message: "Authorization token is required.",
    });
    return;
  }

  let jwtSecret: string;

  try {
    jwtSecret = getJwtSecret();
  } catch (error) {
    response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "JWT configuration is invalid.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (!isJwtUserPayload(decoded)) {
      response.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
      return;
    }

    request.user = decoded;
    next();
  } catch (error) {
    response.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}
