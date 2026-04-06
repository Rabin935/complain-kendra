import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error("Unhandled API error:", error);

  response.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}
