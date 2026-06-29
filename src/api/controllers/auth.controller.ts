import type { NextFunction, Request, Response } from "express";
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from "../services/auth.service";
import type { AuthResponse, CreateUserDto, LoginDto } from "../types";

export async function register(
  request: Request<Record<string, never>, unknown, Partial<CreateUserDto>>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await registerUser(request.body as CreateUserDto);

    response.status(201).json({
      success: true,
      message: "User registered successfully.",
      user,
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
    const result = await loginUser(request.body as LoginDto);

    response.status(200).json({
      success: true,
      message: "Login successful.",
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  request: Request<Record<string, never>, unknown, { refreshToken?: string }>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await refreshSession(request.body.refreshToken ?? "");

    response.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  request: Request<Record<string, never>, unknown, { refreshToken?: string }>,
  response: Response<AuthResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    await logoutSession(request.body.refreshToken);

    response.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
}
