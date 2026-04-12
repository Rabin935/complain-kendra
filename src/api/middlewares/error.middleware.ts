import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
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

  if (error instanceof MulterError) {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Photo must be 10 MB or smaller."
        : error.message;

    response.status(statusCode).json({
      success: false,
      message,
    });
    return;
  }

  console.error("Unhandled API error:", error);

  response.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}
