import { OAuth2Client } from "google-auth-library";
import { AppError } from "../utils/appError";

const googleClient = new OAuth2Client();

export interface VerifiedGoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

function getGoogleAudiences(): string[] {
  const configuredAudiences = [
    process.env.GOOGLE_WEB_CLIENT_ID?.trim(),
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim(),
  ].filter(Boolean) as string[];

  if (configuredAudiences.length === 0) {
    throw new AppError(
      "GOOGLE_WEB_CLIENT_ID is not configured. Add the Google OAuth web client ID to the environment before using Google Sign-In.",
      500,
    );
  }

  return [
    ...new Set(
      configuredAudiences
        .join(",")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: getGoogleAudiences(),
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new AppError("Unable to read the Google account details from the provided token.", 401);
    }

    if (!payload.email_verified) {
      throw new AppError("Your Google account email must be verified before signing in.", 401);
    }

    const resolvedName =
      payload.name?.trim() ||
      payload.given_name?.trim() ||
      payload.email.split("@")[0] ||
      "Google User";

    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: resolvedName,
      avatarUrl: payload.picture?.trim() || undefined,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Google token verification failed. Double-check GOOGLE_WEB_CLIENT_ID and the native Google client configuration.",
      401,
    );
  }
}
