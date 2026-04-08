import { Platform } from "react-native";
import { apiClient } from "../../../utils/api";
import { getConfiguredGoogleSignin } from "../../../../src/features/auth/config/google.config";
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types/auth.types";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", payload);
  return data;
}

export async function signInWithGoogle(): Promise<AuthResponse | null> {
  const googleSignIn = await getConfiguredGoogleSignin();

  if (Platform.OS === "android") {
    await googleSignIn.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  const signInResponse = await googleSignIn.GoogleSignin.signIn();

  if (!googleSignIn.isSuccessResponse(signInResponse)) {
    return null;
  }

  const idToken = signInResponse.data.idToken;

  if (!idToken) {
    throw new Error(
      "Google Sign-In completed, but no ID token was returned. Check your Google client IDs.",
    );
  }

  const { data } = await apiClient.post<AuthResponse>("/api/auth/google", { idToken });
  return data;
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    const googleSignIn = await getConfiguredGoogleSignin();
    await googleSignIn.GoogleSignin.signOut();
  } catch {
    // Ignore Google logout cleanup failures so app logout can always complete.
  }
}
