import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import RefreshTokenModel from "../models/RefreshToken";
import { createUser, findUserByEmail } from "../repositories/user.repository";
import type { AuthUser, CreateUserDto, LoginDto } from "../types";
import { AppError } from "../utils/appError";
import { sendPasswordResetEmail } from "./email.service";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ??
  "15m") as SignOptions["expiresIn"];
const DEFAULT_REFRESH_TOKEN_DAYS = 30;
const PASSWORD_RESET_TOKEN_MINUTES = 30;

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("JWT_SECRET is not defined in the environment.", 500);
  }

  return jwtSecret;
}

function normalizeText(value: string): string {
  return value.trim();
}

function getRefreshTokenDays(): number {
  const configuredDays = Number(process.env.REFRESH_TOKEN_DAYS);
  return Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_REFRESH_TOKEN_DAYS;
}

function createTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function createAccessToken(user: {
  _id: { toString(): string };
  email: string;
  role: "user" | "admin";
}): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

async function createRefreshToken(userId: string): Promise<string> {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + getRefreshTokenDays() * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    userId,
    tokenHash: createTokenHash(refreshToken),
    expiresAt,
  });

  return refreshToken;
}

function validateRegisterInput(payload: CreateUserDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid registration payload.", 400);
  }

  if (!payload.name?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
    throw new AppError("Name, email, and password are required.", 400);
  }
}

function validateLoginInput(payload: LoginDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid login payload.", 400);
  }

  if (!payload.email?.trim() || !payload.password?.trim()) {
    throw new AppError("Email and password are required.", 400);
  }
}

function toSafeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: "user" | "admin";
  phone?: string;
  createdAt?: Date;
}): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}

export async function registerUser(payload: CreateUserDto): Promise<AuthUser> {
  validateRegisterInput(payload);

  const normalizedEmail = normalizeText(payload.email).toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError("User with this email already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const createdUser = await createUser({
    name: normalizeText(payload.name),
    email: normalizedEmail,
    password: hashedPassword,
    phone: payload.phone?.trim() ? normalizeText(payload.phone) : undefined,
  });

  return toSafeUser(createdUser);
}

export async function loginUser(payload: LoginDto): Promise<LoginResult> {
  validateLoginInput(payload);

  const normalizedEmail = normalizeText(payload.email).toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user._id.toString());

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  if (!refreshToken?.trim()) {
    throw new AppError("Refresh token is required.", 400);
  }

  const tokenHash = createTokenHash(refreshToken.trim());
  const storedToken = await RefreshTokenModel.findOne({ tokenHash });

  if (!storedToken || storedToken.revokedAt) {
    throw new AppError("Invalid refresh token.", 401);
  }

  if (storedToken.expiresAt.getTime() <= Date.now()) {
    storedToken.revokedAt = new Date();
    await storedToken.save();
    throw new AppError("Refresh token has expired.", 401);
  }

  const user = await storedToken.populate("userId");
  const authUser = user.userId as unknown as {
    _id: { toString(): string };
    name: string;
    email: string;
    role: "user" | "admin";
    phone?: string;
    createdAt?: Date;
  };

  if (!authUser?.email) {
    throw new AppError("Refresh token user no longer exists.", 401);
  }

  const nextRefreshToken = generateOpaqueToken();
  const nextRefreshHash = createTokenHash(nextRefreshToken);
  storedToken.revokedAt = new Date();
  storedToken.replacedByTokenHash = nextRefreshHash;

  await Promise.all([
    storedToken.save(),
    RefreshTokenModel.create({
      userId: authUser._id.toString(),
      tokenHash: nextRefreshHash,
      expiresAt: new Date(Date.now() + getRefreshTokenDays() * 24 * 60 * 60 * 1000),
    }),
  ]);

  return {
    accessToken: createAccessToken(authUser),
    refreshToken: nextRefreshToken,
    user: toSafeUser(authUser),
  };
}

export async function logoutSession(refreshToken?: string): Promise<void> {
  if (!refreshToken?.trim()) {
    return;
  }

  await RefreshTokenModel.updateOne(
    {
      tokenHash: createTokenHash(refreshToken.trim()),
      revokedAt: undefined,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email?.trim()) {
    throw new AppError("Email is required.", 400);
  }

  const normalizedEmail = normalizeText(email).toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return;
  }

  const resetToken = generateOpaqueToken();
  user.passwordResetTokenHash = createTokenHash(resetToken);
  user.passwordResetExpiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000,
  );
  await user.save();

  await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetToken,
  });
}

export async function resetPassword(input: {
  token?: string;
  password?: string;
}): Promise<void> {
  const token = input.token?.trim();
  const password = input.password?.trim();

  if (!token || !password) {
    throw new AppError("Reset token and new password are required.", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters long.", 400);
  }

  const user = await import("../models/User").then(({ default: UserModel }) =>
    UserModel.findOne({
      passwordResetTokenHash: createTokenHash(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }),
  );

  if (!user) {
    throw new AppError("Invalid or expired reset token.", 400);
  }

  user.password = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  await RefreshTokenModel.updateMany(
    { userId: user._id, revokedAt: undefined },
    { $set: { revokedAt: new Date() } },
  );
}
