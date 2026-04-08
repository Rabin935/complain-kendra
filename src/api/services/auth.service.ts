import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserByGoogleId } from "../repositories/user.repository";
import { verifyGoogleIdToken } from "./google-auth.service";
import type { AuthUser, CreateUserDto, GoogleLoginDto, LoginDto } from "../types";
import { AppError } from "../utils/appError";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";

export interface LoginResult {
  token: string;
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
