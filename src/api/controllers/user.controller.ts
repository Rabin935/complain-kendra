import type { NextFunction, Request, Response } from "express";
import {
  changePassword,
  getCurrentUser,
  getPublicUser,
  getUserBadges,
  getUserStats,
  updateCurrentUser,
  updateLanguage,
  uploadAvatar as uploadAvatarService,
} from "../services/user.service";
import { AppError } from "../utils/appError";
import { getString } from "../utils/request.utils";

function requireCitizenId(request: Request): string {
  if (!request.user || request.user.type !== "citizen") {
    throw new AppError("Citizen authentication is required.", 401);
  }

  return request.user.subjectId;
}

export async function me(request: Request, response: Response, next: NextFunction) {
  try {
    const user = await getCurrentUser(requireCitizenId(request));

    response.status(200).json({
      success: true,
      user,
      profile: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(request: Request, response: Response, next: NextFunction) {
  try {
    const user = await updateCurrentUser(
      requireCitizenId(request),
      request.body as Record<string, unknown>,
    );

    response.status(200).json({
      success: true,
      message: "Profile updated.",
      user,
      profile: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatar(request: Request, response: Response, next: NextFunction) {
  try {
    if (!request.file) {
      throw new AppError("Avatar file is required.", 400);
    }

    const user = await uploadAvatarService(requireCitizenId(request), request.file);

    response.status(200).json({
      success: true,
      message: "Avatar uploaded.",
      user,
      profile: user,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    next(error);
  }
}

export async function password(request: Request, response: Response, next: NextFunction) {
  try {
    const body = request.body as { currentPassword?: string; newPassword?: string };
    await changePassword({
      userId: requireCitizenId(request),
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    response.status(200).json({
      success: true,
      message: "Password changed.",
    });
  } catch (error) {
    next(error);
  }
}

export async function language(request: Request, response: Response, next: NextFunction) {
  try {
    const body = request.body as { language?: string };
    const user = await updateLanguage(requireCitizenId(request), getString(body.language));

    response.status(200).json({
      success: true,
      message: "Language updated.",
      user,
      profile: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function stats(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await getUserStats(requireCitizenId(request));

    response.status(200).json({
      success: true,
      stats: result,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function badges(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await getUserBadges(requireCitizenId(request));

    response.status(200).json({
      success: true,
      badges: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function publicProfile(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const user = await getPublicUser(request.params.id);

    response.status(200).json({
      success: true,
      user,
      profile: user,
    });
  } catch (error) {
    next(error);
  }
}
