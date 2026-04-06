import type { NextFunction, Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";
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
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}
