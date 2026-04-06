import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserDocument } from "../models/User";
import { createUser, findUserByEmail } from "../repositories/user.repository";
import type { CreateUserDto, LoginDto, UserRole } from "../types";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUser;
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in the environment.");
  }

  return jwtSecret;
}

function toAuthenticatedUser(user: UserDocument): AuthenticatedUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function registerUser(payload: CreateUserDto): Promise<AuthenticatedUser> {
  const existingUser = await findUserByEmail(payload.email);

  if (existingUser) {
    throw new Error("User with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const createdUser = await createUser({
    ...payload,
    email: payload.email.trim().toLowerCase(),
    password: hashedPassword,
    role: payload.role ?? "user",
  });

  return toAuthenticatedUser(createdUser);
}

export async function loginUser(payload: LoginDto): Promise<LoginResult> {
  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new Error("Invalid email or password.");
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN },
  );

  return {
    token,
    user: toAuthenticatedUser(user),
  };
}
