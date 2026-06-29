import { promises as dns } from "node:dns";
import mongoose from "mongoose";

function extractMongoHost(mongoUri: string): string | null {
  // Handles mongodb:// and mongodb+srv:// URIs.
  const match = mongoUri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)/i);
  return match?.[1] ?? null;
}

async function validateMongoDns(mongoUri: string): Promise<void> {
  const host = extractMongoHost(mongoUri);

  if (!host) {
    return;
  }

  if (mongoUri.startsWith("mongodb+srv://")) {
    const srvName = `_mongodb._tcp.${host}`;
    await dns.resolveSrv(srvName);
    return;
  }

  await dns.lookup(host);
}

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    const error = new Error("MONGO_URI is not defined in the environment.");
    console.error(error.message);
    throw error;
  }

  try {
    await validateMongoDns(mongoUri);
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ENOTFOUND"
    ) {
      const host = extractMongoHost(mongoUri);
      const helpfulError = new Error(
        `MongoDB host "${host ?? "unknown"}" could not be resolved. Check MONGO_URI in .env (Atlas cluster hostname), DNS, or internet access.`,
      );
      console.error("Failed to connect to MongoDB.", helpfulError);
      throw helpfulError;
    }

    console.error("Failed to connect to MongoDB.", error);
    throw error;
  }
}
