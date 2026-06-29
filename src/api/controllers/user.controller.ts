import type { NextFunction, Request, Response } from "express";
import {
  changePassword,
  getProfile,
  updateLanguage,
  updateProfile,
} from "../services/user.service";
import { AppError } from "../utils/appError";

function requireUserId(request: Request): string {
  if (!request.user || request.user.type === "officer") {
    throw new AppError("User authentication is required.", 401);
  }

  return request.user.userId;
}

export async function me(request: Request, response: Response, next: NextFunction) {
  try {
    const user = await getProfile(requireUserId(request));
    response.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function patchMe(request: Request, response: Response, next: NextFunction) {
  try {
    const user = await updateProfile(
      requireUserId(request),
      request.body as Record<string, unknown>,
    );
    response.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchPassword(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    await changePassword(requireUserId(request), request.body as Record<string, unknown>);
    response.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function patchLanguage(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const user = await updateLanguage(
      requireUserId(request),
      request.body as Record<string, unknown>,
    );
    response.status(200).json({
      success: true,
      message: "Language updated successfully.",
      user,
    });
  } catch (error) {
    next(error);
  }
}
