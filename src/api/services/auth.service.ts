import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { createUser, findUserByEmail, findUserByGoogleId, findUserById } from "../repositories/user.repository";
import { verifyGoogleIdToken } from "./google-auth.service";
import { sendPasswordResetEmail } from "./email.service";
import type {
  AuthUser,
  CreateUserDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  ResetPasswordDto,
} from "../types";
import { AppError } from "../utils/appError";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";
const RESET_TOKEN_EXPIRES_IN = "15m";

export interface LoginResult {
  token: string;
  user: AuthUser;
}

interface PasswordResetTokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  type: "password-reset";
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

function validateGoogleLoginInput(payload: GoogleLoginDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid Google login payload.", 400);
  }

  if (!payload.idToken?.trim()) {
    throw new AppError("Google ID token is required.", 400);
  }
}

function validateForgotPasswordInput(payload: ForgotPasswordDto): void {
  if (!payload || typeof payload !== "object") {
    throw new AppError("Invalid forgot password payload.", 400);
  }

  if (!payload.email?.trim()) {
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

  if (typeof payload.newPassword !== "string" || payload.newPassword.length === 0) {
    throw new AppError("New password is required.", 400);
  }

  if (payload.newPassword.length < 6) {
    throw new AppError("New password must be at least 6 characters.", 400);
  }
}

function toSafeUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: "user" | "admin";
  phone?: string;
  isGoogleUser?: boolean;
  avatarUrl?: string;
  createdAt?: Date;
}): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isGoogleUser: user.isGoogleUser,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function createAuthToken(user: {
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
    { expiresIn: TOKEN_EXPIRES_IN },
  );
}

function getPasswordResetSecret(userPassword: string): string {
  return `${getJwtSecret()}:${userPassword}`;
}

function createPasswordResetToken(user: {
  _id: { toString(): string };
  email: string;
  password: string;
}): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      type: "password-reset",
    },
    getPasswordResetSecret(user.password),
    { expiresIn: RESET_TOKEN_EXPIRES_IN },
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
    const payload = jwt.verify(token, getPasswordResetSecret(userPassword)) as PasswordResetTokenPayload;

    if (payload.type !== "password-reset") {
      throw new AppError("Invalid password reset token.", 400);
    }

    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError(
        "Password reset token has expired. Please request a new reset link.",
        400,
      );
    }

    if (error instanceof JsonWebTokenError) {
      throw new AppError("Invalid password reset token.", 400);
    }

    throw error;
  }
}

function createGooglePlaceholderPassword(): string {
  return randomBytes(32).toString("hex");
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
    isGoogleUser: false,
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

  const token = createAuthToken(user);

  return {
    token,
    user: toSafeUser(user),
  };
}

export async function forgotPassword(email: string): Promise<void> {
  validateForgotPasswordInput({ email });

  const normalizedEmail = normalizeText(email).toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return;
  }

  const resetToken = createPasswordResetToken(user);
  await sendPasswordResetEmail(user.email, resetToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  validateResetPasswordInput({ token, newPassword });

  const resetPayload = getResetTokenPayload(token);
  const user = await findUserById(resetPayload.userId);

  if (!user) {
    throw new AppError("Invalid password reset token.", 400);
  }

  verifyResetToken(token, user.password);

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

export async function googleLogin(idToken: string): Promise<LoginResult> {
  validateGoogleLoginInput({ idToken });

  const googleProfile = await verifyGoogleIdToken(normalizeText(idToken));
  let user = await findUserByGoogleId(googleProfile.googleId);

  if (!user) {
    user = await findUserByEmail(googleProfile.email);

    if (user) {
      if (user.googleId && user.googleId !== googleProfile.googleId) {
        throw new AppError("This email is already linked to another Google account.", 409);
      }

      let shouldPersistGoogleProfile = false;

      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
        shouldPersistGoogleProfile = true;
      }

      if (!user.isGoogleUser) {
        user.isGoogleUser = true;
        shouldPersistGoogleProfile = true;
      }

      if (googleProfile.avatarUrl && user.avatarUrl !== googleProfile.avatarUrl) {
        user.avatarUrl = googleProfile.avatarUrl;
        shouldPersistGoogleProfile = true;
      }

      if (shouldPersistGoogleProfile) {
        await user.save();
      }
    } else {
      user = await createUser({
        name: googleProfile.name,
        email: googleProfile.email,
        password: createGooglePlaceholderPassword(),
        googleId: googleProfile.googleId,
        isGoogleUser: true,
        avatarUrl: googleProfile.avatarUrl,
      });
    }
  } else {
    let shouldPersistGoogleProfile = false;

    if (!user.isGoogleUser) {
      user.isGoogleUser = true;
      shouldPersistGoogleProfile = true;
    }

    if (googleProfile.avatarUrl && user.avatarUrl !== googleProfile.avatarUrl) {
      user.avatarUrl = googleProfile.avatarUrl;
      shouldPersistGoogleProfile = true;
    }

    if (shouldPersistGoogleProfile) {
      await user.save();
    }
  }

  return {
    token: createAuthToken(user),
    user: toSafeUser(user),
  };
}
