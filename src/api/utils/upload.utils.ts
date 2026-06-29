import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { AppError } from "./appError";

export interface UploadToCloudinaryInput {
  buffer: Buffer;
  mimeType: string;
  folder?: string;
  originalName?: string;
}

const uploadRoot = path.resolve(__dirname, "..", "uploads");

function getExtension(mimeType: string, originalName?: string): string {
  const originalExtension = originalName ? path.extname(originalName).toLowerCase() : "";

  if ([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(originalExtension)) {
    return originalExtension;
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return ".heic";
  }

  return ".jpg";
}

function normalizeFolder(folder?: string): string {
  return (folder ?? "complaints")
    .split(/[\\/]+/)
    .map((part) => part.trim().replace(/[^a-z0-9_-]/gi, "-"))
    .filter(Boolean)
    .join(path.sep);
}

export function getUploadRoot(): string {
  return uploadRoot;
}

export async function saveUploadedImage({
  buffer,
  mimeType,
  folder,
  originalName,
}: UploadToCloudinaryInput): Promise<string> {
  if (!mimeType.startsWith("image/")) {
    throw new AppError("Only image uploads are supported.", 400);
  }

  if (buffer.length === 0) {
    throw new AppError("Photo file is empty.", 400);
  }

  const safeFolder = normalizeFolder(folder);
  const targetDirectory = path.join(uploadRoot, safeFolder);
  await fs.mkdir(targetDirectory, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}${getExtension(mimeType, originalName)}`;
  await fs.writeFile(path.join(targetDirectory, fileName), buffer);

  return `/uploads/${safeFolder.replace(/\\/g, "/")}/${fileName}`;
}

// Kept for compatibility with existing code while development uses local storage.
export async function uploadToCloudinary(input: UploadToCloudinaryInput): Promise<string> {
  return saveUploadedImage(input);
}
