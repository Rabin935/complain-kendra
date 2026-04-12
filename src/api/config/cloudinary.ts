import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function getRequiredEnv(name: "CLOUDINARY_CLOUD_NAME" | "CLOUDINARY_API_KEY" | "CLOUDINARY_API_SECRET"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not defined in the environment.`);
  }

  return value;
}

export function getCloudinaryFolder(): string {
  return process.env.CLOUDINARY_FOLDER?.trim() || "complainthub/complaints";
}

export function getCloudinary() {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
      api_key: getRequiredEnv("CLOUDINARY_API_KEY"),
      api_secret: getRequiredEnv("CLOUDINARY_API_SECRET"),
      secure: true,
    });

    isConfigured = true;
  }

  return cloudinary;
}
