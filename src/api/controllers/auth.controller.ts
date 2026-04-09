import type { NextFunction, Request, Response } from "express";
import { forgotPassword as forgotPasswordService, googleLogin, loginUser, registerUser } from "../services/auth.service";
import type { AuthResponse, CreateUserDto, ForgotPasswordDto, GoogleLoginDto, LoginDto } from "../types";

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
      token: result.token,
      user: result.user,
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
    const result = await googleLogin((request.body as GoogleLoginDto).idToken);

    response.status(200).json({
      success: true,
      message: "Google login successful.",
      token: result.token,
      user: result.user,
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
