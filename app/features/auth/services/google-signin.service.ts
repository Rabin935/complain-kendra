import { Platform } from "react-native";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

let googleConfigurationPromise: Promise<GoogleSignInModule> | null = null;

// Manual Google Sign-In setup for this Expo project:
// - Android: place google-services.json in the project root, then run `npm run prebuild`.
//   If you keep the generated native Android project, verify android/app/src/main/AndroidManifest.xml
//   still lines up with the package name and Google metadata created from google-services.json.
// - iOS: place GoogleService-Info.plist in the project root so the Expo config plugin can copy it
//   into the generated ios project during `npm run prebuild` / EAS builds.

function getGoogleWebClientId(): string {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  if (!webClientId) {
    throw new Error(
      "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment before using Google Sign-In.",
    );
  }

  return webClientId;
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule> {
  if (Platform.OS === "web") {
    throw new Error(
      "Google Sign-In in this project is enabled for Android and iOS native builds only. Use email/password on web.",
    );
  }

  try {
    return await import("@react-native-google-signin/google-signin");
  } catch {
    throw new Error(
      "Google Sign-In native code is unavailable. Add the Google config files, run `npm run prebuild`, and open the app with `npm run android:native` or `npm run ios:native` instead of Expo Go.",
    );
  }
}

async function ensureGoogleConfigured(): Promise<GoogleSignInModule> {
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
  if (Platform.OS === "web") {
    return "Google Sign-In is available in Android and iOS native builds after the Google config files are added.";
  }

  return null;
}

export async function requestGoogleIdToken(): Promise<string | null> {
  const googleSignIn = await ensureGoogleConfigured();

  if (Platform.OS === "android") {
    await googleSignIn.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  const response = await googleSignIn.GoogleSignin.signIn();

  if (!googleSignIn.isSuccessResponse(response)) {
    return null;
  }

  const idToken = response.data.idToken;

  if (!idToken) {
    throw new Error(
      "Google Sign-In completed, but no ID token was returned. Check the Google web client ID and native config files.",
    );
  }

  return idToken;
}

export async function signOutFromGoogle(): Promise<void> {
  if (!googleConfigurationPromise) {
    return;
  }

  const googleSignIn = await googleConfigurationPromise.catch(() => null);

  if (!googleSignIn) {
    return;
  }

  try {
    await googleSignIn.GoogleSignin.signOut();
  } catch {
    // Ignore Google session cleanup errors so app logout can always complete.
  }
}
