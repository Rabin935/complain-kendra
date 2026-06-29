import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import OfficerModel, { type OfficerDocument } from "../models/Officer";
import OfficerSessionModel from "../models/OfficerSession";
import RefreshTokenModel from "../models/RefreshToken";
import UserModel, { type UserDocument } from "../models/User";
import { verifyGoogleIdToken } from "./google-auth.service";
import { sendPasswordResetEmail } from "./email.service";
import type {
  AuthUser,
  CreateUserDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  JwtUserPayload,
  LoginDto,
  OfficerRole,
  ResetPasswordDto,
  SubjectType,
  UserRole,
} from "../types";
import { AppError } from "../utils/appError";

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const RESET_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30);

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  token: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface PasswordResetTokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  type: "password-reset";
}

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

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

function validateRegisterInput(payload: CreateUserDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid registration payload.", 400);
  }

  if (!payload.name?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
    throw new AppError("Name, email, and password are required.", 400);
  }

  if (payload.password.length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
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

function validateGoogleLoginInput(payload: GoogleLoginDto): void {
  if (!payload || typeof payload !== "object" || !payload.idToken?.trim()) {
    throw new AppError("Google ID token is required.", 400);
  }
}

function validateForgotPasswordInput(payload: ForgotPasswordDto): void {
  if (!payload || typeof payload !== "object" || !payload.email?.trim()) {
    throw new AppError("Email is required.", 400);
  }
}

function validateResetPasswordInput(payload: ResetPasswordDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid reset password payload.", 400);
  }

  if (!payload.token?.trim()) {
    throw new AppError("Reset token is required.", 400);
  }

  if (!payload.newPassword || payload.newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters.", 400);
  }
}

function toSafeCitizen(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    ward: user.ward,
    isGoogleUser: user.isGoogleUser,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function toSafeOfficer(officer: OfficerDocument): AuthUser {
  return {
    id: officer._id.toString(),
    name: officer.name,
    email: officer.email,
    role: officer.role,
    phone: officer.phone,
    ward: officer.ward,
    department: officer.department,
    avatarUrl: officer.avatarUrl,
    createdAt: officer.createdAt,
  };
}

function createAccessToken(subject: {
  id: string;
  email: string;
  role: UserRole;
  type: SubjectType;
}): string {
  const payload: Omit<JwtUserPayload, "iat" | "exp"> = {
    userId: subject.id,
    subjectId: subject.id,
    email: subject.email,
    role: subject.role,
    type: subject.type,
    tokenType: "access",
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
}

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString("hex");
}

function getRefreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

async function createRefreshSession(input: {
  subjectId: string;
  subjectType: SubjectType;
  meta?: RequestMeta;
}) {
  const refreshToken = createRefreshTokenValue();
  const expiresAt = getRefreshExpiry();
  const record = await RefreshTokenModel.create({
    subjectId: input.subjectId,
    subjectType: input.subjectType,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    ipAddress: input.meta?.ipAddress,
    userAgent: input.meta?.userAgent,
  });

  if (input.subjectType === "officer") {
    await OfficerSessionModel.create({
      officerId: input.subjectId,
      refreshTokenId: record._id.toString(),
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      expiresAt,
      lastSeenAt: new Date(),
    });
  }

  return refreshToken;
}

async function buildLoginResult(input: {
  subjectId: string;
  email: string;
  role: UserRole;
  type: SubjectType;
  user: AuthUser;
  meta?: RequestMeta;
}): Promise<LoginResult> {
  const accessToken = createAccessToken({
    id: input.subjectId,
    email: input.email,
    role: input.role,
    type: input.type,
  });
  const refreshToken = await createRefreshSession({
    subjectId: input.subjectId,
    subjectType: input.type,
    meta: input.meta,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: input.user,
  };
}

export async function registerUser(
  payload: CreateUserDto,
  meta?: RequestMeta,
): Promise<LoginResult> {
  validateRegisterInput(payload);

  const normalizedEmail = normalizeText(payload.email).toLowerCase();
  const existingUser = await UserModel.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User with this email already exists.", 409);
  }

  const createdUser = await UserModel.create({
    name: normalizeText(payload.name),
    email: normalizedEmail,
    password: payload.password,
    phone: payload.phone?.trim() ? normalizeText(payload.phone) : undefined,
    ward: payload.ward?.trim() || "12",
    address: payload.address?.trim() || "Koteshwor, Kathmandu",
    location: payload.location ?? {
      ward: payload.ward?.trim() || "Ward 12",
      wardId: payload.ward?.trim() || "12",
      area: "Koteshwor",
      city: "Kathmandu",
      address: payload.address?.trim() || "Koteshwor, Kathmandu",
      lat: 27.678,
      lng: 85.349,
    },
    isGoogleUser: false,
  });

  return buildLoginResult({
    subjectId: createdUser._id.toString(),
    email: createdUser.email,
    role: createdUser.role,
    type: "citizen",
    user: toSafeCitizen(createdUser),
    meta,
  });
}

export async function loginUser(payload: LoginDto, meta?: RequestMeta): Promise<LoginResult> {
  validateLoginInput(payload);

  const normalizedEmail = normalizeText(payload.email).toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.isBanned) {
    throw new AppError(user.banReason || "This account is banned.", 403);
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  return buildLoginResult({
    subjectId: user._id.toString(),
    email: user.email,
    role: user.role,
    type: "citizen",
    user: toSafeCitizen(user),
    meta,
  });
}

export async function loginOfficer(
  payload: LoginDto,
  meta?: RequestMeta,
): Promise<LoginResult> {
  validateLoginInput(payload);

  const normalizedEmail = normalizeText(payload.email).toLowerCase();
  const officer = await OfficerModel.findOne({ email: normalizedEmail });

  if (!officer || !officer.isActive) {
    throw new AppError("Invalid officer email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(payload.password, officer.password);

  if (!passwordMatches) {
    throw new AppError("Invalid officer email or password.", 401);
  }

  officer.lastLoginAt = new Date();
  await officer.save();

  return buildLoginResult({
    subjectId: officer._id.toString(),
    email: officer.email,
    role: officer.role,
    type: "officer",
    user: toSafeOfficer(officer),
    meta,
  });
}

export async function refreshSession(
  refreshToken: string,
  expectedType?: SubjectType,
): Promise<LoginResult> {
  if (!refreshToken?.trim()) {
    throw new AppError("Refresh token is required.", 400);
  }

  const tokenRecord = await RefreshTokenModel.findOne({
    tokenHash: hashRefreshToken(refreshToken),
    revokedAt: undefined,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenRecord || (expectedType && tokenRecord.subjectType !== expectedType)) {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  if (tokenRecord.subjectType === "citizen") {
    const user = await UserModel.findById(tokenRecord.subjectId);

    if (!user || user.isBanned) {
      throw new AppError("Invalid refresh token subject.", 401);
    }

    const accessToken = createAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "citizen",
    });

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      user: toSafeCitizen(user),
    };
  }

  const officer = await OfficerModel.findById(tokenRecord.subjectId);

  if (!officer || !officer.isActive) {
    throw new AppError("Invalid refresh token subject.", 401);
  }

  await OfficerSessionModel.updateOne(
    { refreshTokenId: tokenRecord._id.toString() },
    { $set: { lastSeenAt: new Date() } },
  );

  const accessToken = createAccessToken({
    id: officer._id.toString(),
    email: officer.email,
    role: officer.role,
    type: "officer",
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: toSafeOfficer(officer),
  };
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const tokenRecord = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash, revokedAt: undefined },
    { $set: { revokedAt: new Date() } },
  );

  if (tokenRecord) {
    await OfficerSessionModel.updateMany(
      { refreshTokenId: tokenRecord._id.toString() },
      { $set: { revokedAt: new Date() } },
    );
  }
}

function getPasswordResetSecret(userPassword: string): string {
  return `${getJwtSecret()}:${userPassword}`;
}

function createPasswordResetToken(user: UserDocument): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      type: "password-reset",
    },
    getPasswordResetSecret(user.password),
    { expiresIn: RESET_TOKEN_EXPIRES_IN } as jwt.SignOptions,
  );
}

function getResetTokenPayload(token: string): PasswordResetTokenPayload {
  const decodedToken = jwt.decode(token);

  if (!decodedToken || typeof decodedToken !== "object") {
    throw new AppError("Invalid password reset token.", 400);
  }

  const payload = decodedToken as Partial<PasswordResetTokenPayload>;

  if (!payload.userId || payload.type !== "password-reset") {
    throw new AppError("Invalid password reset token.", 400);
  }

  return payload as PasswordResetTokenPayload;
}

function verifyResetToken(token: string, userPassword: string): PasswordResetTokenPayload {
  try {
    const payload = jwt.verify(
      token,
      getPasswordResetSecret(userPassword),
    ) as PasswordResetTokenPayload;

    if (payload.type !== "password-reset") {
      throw new AppError("Invalid password reset token.", 400);
    }

    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError("Password reset token has expired. Please request a new reset link.", 400);
    }

    if (error instanceof JsonWebTokenError) {
      throw new AppError("Invalid password reset token.", 400);
    }

    throw error;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  validateForgotPasswordInput({ email });

  const user = await UserModel.findOne({ email: normalizeText(email).toLowerCase() });

  if (!user) {
    return;
  }

  const resetToken = createPasswordResetToken(user);
  await sendPasswordResetEmail(user.email, resetToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  validateResetPasswordInput({ token, newPassword });

  const resetPayload = getResetTokenPayload(token);
  const user = await UserModel.findById(resetPayload.userId);

  if (!user) {
    throw new AppError("Invalid password reset token.", 400);
  }

  verifyResetToken(token, user.password);
  user.password = newPassword;
  await user.save();
}

export async function googleLogin(
  idToken: string,
  meta?: RequestMeta,
): Promise<LoginResult> {
  validateGoogleLoginInput({ idToken });

  const googleProfile = await verifyGoogleIdToken(normalizeText(idToken));
  let user = await UserModel.findOne({ googleId: googleProfile.googleId });

  if (!user) {
    user = await UserModel.findOne({ email: googleProfile.email });

    if (user) {
      user.googleId = googleProfile.googleId;
      user.isGoogleUser = true;
      user.avatarUrl = googleProfile.avatarUrl || user.avatarUrl;
      await user.save();
    } else {
      user = await UserModel.create({
        name: googleProfile.name,
        email: googleProfile.email,
        password: crypto.randomBytes(32).toString("hex"),
        googleId: googleProfile.googleId,
        isGoogleUser: true,
        avatarUrl: googleProfile.avatarUrl,
        ward: "12",
        location: {
          ward: "Ward 12",
          wardId: "12",
          area: "Koteshwor",
          city: "Kathmandu",
        },
      });
    }
  }

  return buildLoginResult({
    subjectId: user._id.toString(),
    email: user.email,
    role: user.role,
    type: "citizen",
    user: toSafeCitizen(user),
    meta,
  });
}

export function sendOtp(email: string): { devOtp?: string } {
  if (!email?.trim()) {
    throw new AppError("Email is required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(normalizedEmail, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  console.log(`ComplainKendra OTP for ${normalizedEmail}: ${otp}`);

  return process.env.NODE_ENV === "production" ? {} : { devOtp: otp };
}

export function verifyOtp(email: string, otp: string): void {
  if (!email?.trim() || !otp?.trim()) {
    throw new AppError("Email and OTP are required.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record || record.expiresAt < Date.now() || record.otp !== otp.trim()) {
    throw new AppError("Invalid or expired OTP.", 400);
  }

  otpStore.delete(normalizedEmail);
}

export async function listOfficerSessions(officerId: string) {
  return OfficerSessionModel.find({ officerId, revokedAt: undefined })
    .sort({ lastSeenAt: -1 })
    .lean();
}

export async function revokeOfficerSession(officerId: string, sessionId: string): Promise<void> {
  const session = await OfficerSessionModel.findOneAndUpdate(
    { _id: sessionId, officerId, revokedAt: undefined },
    { $set: { revokedAt: new Date() } },
  );

  if (!session) {
    throw new AppError("Officer session not found.", 404);
  }

  await RefreshTokenModel.updateOne(
    { _id: session.refreshTokenId },
    { $set: { revokedAt: new Date() } },
  );
}

export function isOfficerRole(role: UserRole): role is OfficerRole {
  return role === "officer" || role === "supervisor" || role === "admin";
}
