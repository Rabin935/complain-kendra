import type { NextFunction, Request, Response } from "express";
import {
  forgotPassword as forgotPasswordService,
  googleLogin,
  listOfficerSessions,
  loginOfficer,
  loginUser,
  logout as logoutService,
  refreshSession,
  registerUser,
  resetPassword as resetPasswordService,
  revokeOfficerSession,
  sendOtp,
  verifyOtp,
  type RequestMeta,
} from "../services/auth.service";
import type {
  AuthResponse,
  CreateUserDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  ResetPasswordDto,
} from "../types";
import { AppError } from "../utils/appError";

function getRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent"),
  };
}

function getRefreshToken(request: Request): string | undefined {
  const body = request.body as { refreshToken?: unknown };

  return typeof body?.refreshToken === "string" ? body.refreshToken : undefined;
}

export async function register(
  request: Request<Record<string, never>, unknown, Partial<CreateUserDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registerUser(request.body as CreateUserDto, getRequestMeta(request));

    response.status(201).json({
      success: true,
      message: "User registered successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  request: Request<Record<string, never>, unknown, Partial<LoginDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginUser(request.body as LoginDto, getRequestMeta(request));

    response.status(200).json({
      success: true,
      message: "Login successful.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function officerLogin(
  request: Request<Record<string, never>, unknown, Partial<LoginDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginOfficer(request.body as LoginDto, getRequestMeta(request));

    response.status(200).json({
      success: true,
      message: "Officer login successful.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleAuth(
  request: Request<Record<string, never>, unknown, Partial<GoogleLoginDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await googleLogin(
      (request.body as GoogleLoginDto).idToken,
      getRequestMeta(request),
    );

    response.status(200).json({
      success: true,
      message: "Google login successful.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  request: Request,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await refreshSession(getRefreshToken(request) ?? "", "citizen");

    response.status(200).json({
      success: true,
      message: "Token refreshed.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function officerRefresh(
  request: Request,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await refreshSession(getRefreshToken(request) ?? "", "officer");

    response.status(200).json({
      success: true,
      message: "Officer token refreshed.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  request: Request,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    await logoutService(getRefreshToken(request));

    response.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  request: Request<Record<string, never>, unknown, Partial<ForgotPasswordDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    await forgotPasswordService((request.body as ForgotPasswordDto).email);

    response.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  request: Request<Record<string, never>, unknown, Partial<ResetPasswordDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = request.body as ResetPasswordDto;
    await resetPasswordService(token, newPassword);

    response.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export function otpSend(request: Request, response: Response, next: NextFunction): void {
  try {
    const body = request.body as { email?: string };
    const result = sendOtp(body.email ?? "");

    response.status(200).json({
      success: true,
      message: "OTP sent.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export function otpVerify(request: Request, response: Response, next: NextFunction): void {
  try {
    const body = request.body as { email?: string; otp?: string };
    verifyOtp(body.email ?? "", body.otp ?? "");

    response.status(200).json({
      success: true,
      message: "OTP verified.",
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
    if (!request.user || request.user.type !== "officer") {
      throw new AppError("Officer authentication is required.", 401);
    }

    const sessions = await listOfficerSessions(request.user.subjectId);

    response.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
}

export async function officerSessionDelete(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.user || request.user.type !== "officer") {
      throw new AppError("Officer authentication is required.", 401);
    }

    await revokeOfficerSession(request.user.subjectId, request.params.id);

    response.status(200).json({
      success: true,
      message: "Officer session revoked.",
    });
  } catch (error) {
    next(error);
  }
}
