import axios from "axios";
import { Platform } from "react-native";
import { apiClient } from "../../../utils/api";
import {
  getConfiguredGoogleSignin,
} from "../../../../src/features/auth/config/google.config";
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types/auth.types";

function getGoogleSignInErrorMessage(error: unknown, googleStatusCodes?: Record<string, string>): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return "Network error. Check your internet connection and try Google Sign-In again.";
    }

    if (error.code === "ECONNABORTED") {
      return "Google Sign-In timed out. Please try again.";
    }
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");

    if (
      code === googleStatusCodes?.SIGN_IN_CANCELLED ||
      code === "SIGN_IN_CANCELLED"
    ) {
      return "Google Sign-In cancelled.";
    }

    if (code === googleStatusCodes?.IN_PROGRESS || code === "IN_PROGRESS") {
      return "Google Sign-In is already in progress.";
    }

    if (
      code === googleStatusCodes?.PLAY_SERVICES_NOT_AVAILABLE ||
      code === "PLAY_SERVICES_NOT_AVAILABLE"
    ) {
      return "Google Play Services are unavailable or need an update on this device.";
    }

    if (code === googleStatusCodes?.SIGN_IN_REQUIRED || code === "SIGN_IN_REQUIRED") {
      return "Please select a Google account to continue.";
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("network")) {
      return "Network error. Check your internet connection and try Google Sign-In again.";
    }

    return error.message;
  }

  return "Google Sign-In failed. Please try again.";
}

async function exchangeGoogleIdToken(idToken: string): Promise<AuthResponse> {
  if (!idToken) {
    throw new Error("Google Sign-In completed, but no ID token was returned.");
  }

  const { data } = await apiClient.post<AuthResponse>("/api/auth/google", { idToken });
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", payload);
  return data;
}

export async function signInWithGoogle(googleIdToken?: string): Promise<AuthResponse | null> {
  let googleStatusCodes: Record<string, string> | undefined;

  try {
    if (Platform.OS === "web") {
      if (!googleIdToken) {
        throw new Error(
          "Use the Google web sign-in button to continue. Make sure http://localhost and http://localhost:3000 are listed in Google Cloud Console Authorized JavaScript origins.",
        );
      }

      return await exchangeGoogleIdToken(googleIdToken);
    }

    const googleSignIn = await getConfiguredGoogleSignin();
    googleStatusCodes = googleSignIn.statusCodes as Record<string, string>;

    if (Platform.OS === "android") {
      await googleSignIn.GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const signInResponse = await googleSignIn.GoogleSignin.signIn();

    if (!googleSignIn.isSuccessResponse(signInResponse)) {
      throw new Error("Google Sign-In cancelled.");
    }

    const nativeIdToken = signInResponse.data.idToken;

    if (!nativeIdToken) {
      throw new Error(
        "Google Sign-In completed, but no ID token was returned. Check your Google client IDs.",
      );
    }

    return await exchangeGoogleIdToken(nativeIdToken);
  } catch (error) {
    throw new Error(getGoogleSignInErrorMessage(error, googleStatusCodes));
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    const googleSignIn = await getConfiguredGoogleSignin();
    await googleSignIn.GoogleSignin.signOut();
  } catch {
    // Ignore Google logout cleanup failures so app logout can always complete.
  }
}
