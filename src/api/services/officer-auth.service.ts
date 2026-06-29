import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import OfficerModel, { OfficerDocument } from "../models/Officer";
import OfficerSessionModel from "../models/OfficerSession";
import type { AuthOfficer, OfficerLoginDto } from "../types";
import { AppError } from "../utils/appError";

const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ??
  "15m") as SignOptions["expiresIn"];
const DEFAULT_SESSION_DAYS = 30;

interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface OfficerLoginResult {
  accessToken: string;
  refreshToken: string;
  officer: AuthOfficer;
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("JWT_SECRET is not defined in the environment.", 500);
  }

  return jwtSecret;
}

function createTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function getSessionDays(): number {
  const configuredDays = Number(process.env.REFRESH_TOKEN_DAYS);
  return Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_SESSION_DAYS;
}

function toSafeOfficer(officer: OfficerDocument): AuthOfficer {
  return {
    id: officer._id.toString(),
    name: officer.name,
    email: officer.email,
    role: officer.role,
    phone: officer.phone,
    ward: officer.ward,
    department: officer.department,
    isActive: officer.isActive,
    createdAt: officer.createdAt,
  };
}

function createAccessToken(officer: OfficerDocument): string {
  return jwt.sign(
    {
      userId: officer._id.toString(),
      officerId: officer._id.toString(),
      type: "officer",
      email: officer.email,
      role: officer.role,
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

export async function loginOfficer(
  payload: OfficerLoginDto,
  context: SessionContext = {},
): Promise<OfficerLoginResult> {
  if (!payload.email?.trim() || !payload.password?.trim()) {
    throw new AppError("Email and password are required.", 400);
  }

  const officer = await OfficerModel.findOne({
    email: payload.email.trim().toLowerCase(),
  });

  if (!officer || !officer.isActive) {
    throw new AppError("Invalid officer email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(payload.password, officer.password);

  if (!passwordMatches) {
    throw new AppError("Invalid officer email or password.", 401);
  }

  const refreshToken = generateOpaqueToken();

  await OfficerSessionModel.create({
    officerId: officer._id,
    refreshTokenHash: createTokenHash(refreshToken),
    expiresAt: new Date(Date.now() + getSessionDays() * 24 * 60 * 60 * 1000),
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  return {
    accessToken: createAccessToken(officer),
    refreshToken,
    officer: toSafeOfficer(officer),
  };
}

export async function listOfficerSessions(officerId: string) {
  return OfficerSessionModel.find({
    officerId,
    revokedAt: undefined,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

export async function logoutOfficerSession(refreshToken?: string): Promise<void> {
  if (!refreshToken?.trim()) {
    throw new AppError("Refresh token is required.", 400);
  }

  await OfficerSessionModel.updateOne(
    {
      refreshTokenHash: createTokenHash(refreshToken.trim()),
      revokedAt: undefined,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function logoutAllOfficerSessions(officerId: string): Promise<void> {
  await OfficerSessionModel.updateMany(
    {
      officerId,
      revokedAt: undefined,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}
