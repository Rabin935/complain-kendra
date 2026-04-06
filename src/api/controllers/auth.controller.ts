import type { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";
import type { CreateUserDto, LoginDto, UserRole } from "../types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "user" || value === "admin";
}

export async function register(
  request: Request<Record<string, never>, unknown, Partial<CreateUserDto>>,
  response: Response,
): Promise<void> {
  const { name, email, password, phone, role } = request.body;

  if (!hasText(name) || !hasText(email) || !hasText(password)) {
    response.status(400).json({
      success: false,
      message: "Name, email, and password are required.",
    });
    return;
  }

  if (role !== undefined && !isUserRole(role)) {
    response.status(400).json({
      success: false,
      message: "Role must be either user or admin.",
    });
    return;
  }

  try {
    const user = await registerUser({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: hasText(phone) ? phone.trim() : undefined,
      role,
    });

    response.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: { user },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    const statusCode = message === "User with this email already exists." ? 409 : 500;

    response.status(statusCode).json({
      success: false,
      message,
    });
  }
}

export async function login(
  request: Request<Record<string, never>, unknown, Partial<LoginDto>>,
  response: Response,
): Promise<void> {
  const { email, password } = request.body;

  if (!hasText(email) || !hasText(password)) {
    response.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
    return;
  }

  try {
    const result = await loginUser({
      email: email.trim(),
      password,
    });

    response.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    const statusCode = message === "Invalid email or password." ? 401 : 500;

    response.status(statusCode).json({
      success: false,
      message,
    });
  }
}
