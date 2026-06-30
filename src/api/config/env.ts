import { AppError } from "../utils/appError";

const productionRequiredEnv = ["JWT_SECRET", "MONGO_URI"] as const;

export function validateEnvironment(): void {
  const missing = productionRequiredEnv.filter((key) => !process.env[key]?.trim());

  if (missing.length === 0) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(`Missing required environment variables: ${missing.join(", ")}`, 500);
  }

  console.warn(`Missing development environment variables: ${missing.join(", ")}`);
}
