import bcrypt from "bcryptjs";
import UserModel, { UserDocument } from "../models/User";
import type { AuthUser } from "../types";
import { AppError } from "../utils/appError";

function sanitizeUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isPublic: user.isPublic,
    language: user.language,
    createdAt: user.createdAt,
  };
}

async function findUserOrThrow(userId: string): Promise<UserDocument> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return user;
}

export async function getProfile(userId: string): Promise<AuthUser> {
  return sanitizeUser(await findUserOrThrow(userId));
}

export async function updateProfile(
  userId: string,
  payload: Record<string, unknown>,
): Promise<AuthUser> {
  const user = await findUserOrThrow(userId);

  if (typeof payload.name === "string" && payload.name.trim()) {
    user.name = payload.name.trim();
  }

  if (typeof payload.phone === "string") {
    user.phone = payload.phone.trim() || undefined;
  }

  if (typeof payload.avatarUrl === "string" || typeof payload.avatar_url === "string") {
    const avatarUrl = String(payload.avatarUrl ?? payload.avatar_url).trim();
    user.avatarUrl = avatarUrl || undefined;
  }

  if (typeof payload.isPublic === "boolean") {
    user.isPublic = payload.isPublic;
  }

  if (typeof payload.is_public === "boolean") {
    user.isPublic = payload.is_public;
  }

  await user.save();
  return sanitizeUser(user);
}

export async function changePassword(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const currentPassword = typeof payload.currentPassword === "string"
    ? payload.currentPassword
    : typeof payload.current_password === "string"
      ? payload.current_password
      : "";
  const nextPassword = typeof payload.newPassword === "string"
    ? payload.newPassword
    : typeof payload.password === "string"
      ? payload.password
      : "";

  if (!currentPassword || !nextPassword) {
    throw new AppError("Current password and new password are required.", 400);
  }

  if (nextPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters long.", 400);
  }

  const user = await findUserOrThrow(userId);
  const passwordMatches = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 401);
  }

  user.password = await bcrypt.hash(nextPassword, 10);
  await user.save();
}

export async function updateLanguage(
  userId: string,
  payload: Record<string, unknown>,
): Promise<AuthUser> {
  const language = typeof payload.language === "string" ? payload.language.trim() : "";

  if (language !== "English" && language !== "Nepali") {
    throw new AppError("Language must be English or Nepali.", 400);
  }

  const user = await findUserOrThrow(userId);
  user.language = language;
  await user.save();

  return sanitizeUser(user);
}
