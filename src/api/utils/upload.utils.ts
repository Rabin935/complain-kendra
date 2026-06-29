import { getCloudinary, getCloudinaryFolder } from "../config/cloudinary";
import type { UploadedPhotoMetadata } from "../types";
import { AppError } from "./appError";

export interface UploadToCloudinaryInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  size: number;
  folder?: string;
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

function toDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function sanitizeUploadFileName(fileName: string): string {
  const baseName = fileName
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return baseName || "complaint-photo";
}

export function isAllowedUploadMimeType(mimeType: string): boolean {
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType.trim().toLowerCase());
}

function shouldMockCloudinaryUploads(): boolean {
  return process.env.MOCK_CLOUDINARY_UPLOADS === "true";
}

export async function uploadToCloudinary({
  buffer,
  mimeType,
  fileName,
  size,
  folder = getCloudinaryFolder(),
}: UploadToCloudinaryInput): Promise<UploadedPhotoMetadata> {
  if (!isAllowedUploadMimeType(mimeType)) {
    throw new AppError("Only JPEG, PNG, and HEIC images are allowed.", 400);
  }

  if (buffer.length === 0) {
    throw new AppError("Photo file is empty.", 400);
  }

  const sanitizedName = `${sanitizeUploadFileName(fileName)}-${Date.now()}-${Math.round(
    Math.random() * 1_000_000,
  )}`;

  if (shouldMockCloudinaryUploads()) {
    return {
      url: `https://mock-cloudinary.local/${folder}/${sanitizedName}`,
      publicId: `${folder}/${sanitizedName}`,
      originalName: fileName,
      sanitizedName,
      mimeType,
      size,
      format: mimeType.split("/")[1],
    };
  }

  try {
    const result = await getCloudinary().uploader.upload(toDataUri(buffer, mimeType), {
      folder,
      resource_type: "image",
      public_id: sanitizedName,
      use_filename: false,
      unique_filename: true,
    });

    if (!result.secure_url || !result.public_id) {
      throw new Error("Cloudinary did not return complete upload metadata.");
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      originalName: fileName,
      sanitizedName,
      mimeType,
      size,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Photo upload failed.", 502);
  }
}

export async function deleteUploadedAsset(publicId: string): Promise<void> {
  if (!publicId.trim()) {
    return;
  }

  if (shouldMockCloudinaryUploads()) {
    return;
  }

  try {
    await getCloudinary().uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Failed to delete uploaded asset:", error);
  }
}
