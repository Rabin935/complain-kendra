import type { NextFunction, Request, Response } from "express";
import {
  listOfficerSessions,
  loginOfficer,
  logoutAllOfficerSessions,
  logoutOfficerSession,
} from "../services/officer-auth.service";
import type { AuthResponse, OfficerLoginDto } from "../types";
import { AppError } from "../utils/appError";

function requireOfficerUser(request: Request) {
  if (!request.user || request.user.type !== "officer") {
    throw new AppError("Officer authentication is required.", 401);
  }

  return request.user;
}

export async function officerLogin(
  request: Request<Record<string, never>, unknown, Partial<OfficerLoginDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginOfficer(request.body as OfficerLoginDto, {
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    response.status(200).json({
      success: true,
      message: "Officer login successful.",
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      officer: result.officer,
    });
  } catch (error) {
    next(error);
  }
}

export async function officerSessions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const officer = requireOfficerUser(request);
    const sessions = await listOfficerSessions(officer.userId);

    response.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
}

export async function officerLogout(
  request: Request<Record<string, never>, unknown, { refreshToken?: string }>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    await logoutOfficerSession(request.body.refreshToken);

    response.status(200).json({
      success: true,
      message: "Officer session logged out.",
    });
  } catch (error) {
    next(error);
  }
}

export async function officerLogoutAll(
  request: Request,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const officer = requireOfficerUser(request);
    await logoutAllOfficerSessions(officer.userId);

    response.status(200).json({
      success: true,
      message: "All officer sessions logged out.",
    });
  } catch (error) {
    next(error);
  }
}
