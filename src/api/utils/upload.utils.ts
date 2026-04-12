import { getCloudinary, getCloudinaryFolder } from "../config/cloudinary";
import { AppError } from "./appError";

export interface UploadToCloudinaryInput {
  buffer: Buffer;
  mimeType: string;
  folder?: string;
}

function toDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function uploadToCloudinary({
  buffer,
  mimeType,
  folder = getCloudinaryFolder(),
}: UploadToCloudinaryInput): Promise<string> {
  if (!mimeType.startsWith("image/")) {
    throw new AppError("Only image uploads are supported.", 400);
  }

  if (buffer.length === 0) {
    throw new AppError("Photo file is empty.", 400);
  }

  try {
    const result = await getCloudinary().uploader.upload(toDataUri(buffer, mimeType), {
      folder,
      resource_type: "image",
    });

    if (!result.secure_url) {
      throw new Error("Cloudinary did not return a secure URL.");
    }

    return result.secure_url;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Photo upload failed.", 502);
  }
}
