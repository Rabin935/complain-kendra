import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

const GOOGLE_WEB_CLIENT_ID_PLACEHOLDER = "REPLACE_WITH_YOUR_WEB_CLIENT_ID";
// Replace with your actual Google Web Client ID from Google Cloud Console
// For local web testing, add http://localhost and http://localhost:3000 to
// Authorized JavaScript origins in the same Google OAuth client.
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || GOOGLE_WEB_CLIENT_ID_PLACEHOLDER;

let googleConfigurationPromise: Promise<GoogleSignInModule> | null = null;

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getGoogleWebClientId(): string {
  if (GOOGLE_WEB_CLIENT_ID === GOOGLE_WEB_CLIENT_ID_PLACEHOLDER) {
    throw new Error(
      "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your Google OAuth web client ID before using Google Sign-In.",
    );
  }

  return GOOGLE_WEB_CLIENT_ID;
}

export function getGoogleWebOrigin(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule> {
  if (Platform.OS === "web") {
    throw new Error(
      "Google Sign-In is enabled for Android and iOS native builds only in this project.",
    );
  }

  if (isExpoGo()) {
    throw new Error(
      "Google Sign-In is not available in Expo Go. Build and open a native app with `npm run android:native` or `npm run ios:native`.",
    );
  }

  try {
    return await import("@react-native-google-signin/google-signin");
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("rngooglesignin") ||
        message.includes("turbomoduleregistry.getenforcing") ||
        message.includes("native binary") ||
        message.includes("configure of undefined")
      ) {
        throw new Error(
          "Google Sign-In is not registered in the current native build. Run `npm run prebuild`, then rebuild with `npm run android:native` or `npm run ios:native`.",
        );
      }
    }

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
          webClientId: getGoogleWebClientId(),
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
  if (isExpoGo()) {
    return "Google Sign-In requires a native build. Expo Go does not include RNGoogleSignin. Use `npm run android:native` or `npm run ios:native`.";
  }

  return null;
}
