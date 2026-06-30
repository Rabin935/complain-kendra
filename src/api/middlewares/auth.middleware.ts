import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { SUBJECT_TYPES, USER_ROLES, type JwtUserPayload, type UserRole } from "../types";

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
    USER_ROLES.includes(payload.role as UserRole) &&
    SUBJECT_TYPES.includes(payload.type as JwtUserPayload["type"])
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

    if (decoded.tokenType && decoded.tokenType !== "access") {
      response.status(401).json({
        success: false,
        message: "Invalid token type.",
      });
      return;
    }

    request.user = {
      ...decoded,
      subjectId: decoded.subjectId ?? decoded.userId,
    };
    next();
  } catch {
    response.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    if (!roles.includes(request.user.role)) {
      response.status(403).json({
        success: false,
        message: "You are not allowed to access this resource.",
      });
      return;
    }

    next();
  };
}

export function requireCitizen(request: Request, response: Response, next: NextFunction): void {
  if (!request.user || request.user.type !== "citizen") {
    response.status(401).json({
      success: false,
      message: "Citizen authentication is required.",
    });
    return;
  }

  next();
}

export function requireOfficer(request: Request, response: Response, next: NextFunction): void {
  if (!request.user || request.user.type !== "officer") {
    response.status(401).json({
      success: false,
      message: "Officer authentication is required.",
    });
    return;
  }

  next();
}
