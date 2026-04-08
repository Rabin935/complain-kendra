import { Platform } from "react-native";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

const GOOGLE_WEB_CLIENT_ID_PLACEHOLDER = "REPLACE_WITH_YOUR_WEB_CLIENT_ID";
// Replace with your actual Google Web Client ID from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || GOOGLE_WEB_CLIENT_ID_PLACEHOLDER;

let googleConfigurationPromise: Promise<GoogleSignInModule> | null = null;

function ensureGoogleWebClientId(): string {
  if (GOOGLE_WEB_CLIENT_ID === GOOGLE_WEB_CLIENT_ID_PLACEHOLDER) {
    throw new Error(
      "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your Google OAuth web client ID before using Google Sign-In.",
    );
  }

  return GOOGLE_WEB_CLIENT_ID;
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule> {
  if (Platform.OS === "web") {
    throw new Error(
      "Google Sign-In is enabled for Android and iOS native builds only in this project.",
    );
  }

  try {
    return await import("@react-native-google-signin/google-signin");
  } catch {
    throw new Error(
      "Google Sign-In native code is unavailable. Run a native build instead of Expo Go after completing Google setup.",
    );
  }
}

export async function getConfiguredGoogleSignin(): Promise<GoogleSignInModule> {
  if (!googleConfigurationPromise) {
    googleConfigurationPromise = loadGoogleSignInModule()
      .then((googleSignIn) => {
        googleSignIn.GoogleSignin.configure({
          webClientId: ensureGoogleWebClientId(),
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
          profileImageSize: 240,
        });

        return googleSignIn;
      })
      .catch((error) => {
        googleConfigurationPromise = null;
        throw error;
      });
  }

  return googleConfigurationPromise;
}

export function getGoogleSignInAvailabilityMessage(): string | null {
  if (Platform.OS === "web") {
    return "Google Sign-In is available in Android and iOS native builds after the Google client IDs and config files are added.";
  }

  return null;
}
