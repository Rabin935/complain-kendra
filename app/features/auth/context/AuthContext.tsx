import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { getApiErrorMessage, setAuthToken, setUnauthorizedHandler } from "../../../../src/lib/api";
import { invalidateCache } from "../../../../src/lib/requestCache";
import { getGoogleSignInAvailabilityMessage } from "../../../../src/features/auth/config/google.config";
import type {
  AuthContextValue,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from "../types/auth.types";
import * as authService from "../services/auth.service";

const TOKEN_STORAGE_KEY = "complain-kendra:token";
const USER_STORAGE_KEY = "complain-kendra:user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.avatarUrl === undefined || typeof candidate.avatarUrl === "string") &&
    (
      candidate.role === "citizen" ||
      candidate.role === "officer" ||
      candidate.role === "supervisor" ||
      candidate.role === "admin"
    )
  );
}

function isStoredToken(token: string | null): token is string {
  return Boolean(token && token.split(".").length === 3);
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of padded) {
    if (char === "=") {
      break;
    }

    const index = alphabet.indexOf(char);

    if (index < 0) {
      throw new Error("Invalid base64 value.");
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    const decodedPayload = decodeBase64Url(payload);
    const parsedPayload = JSON.parse(decodedPayload) as { exp?: unknown };

    return typeof parsedPayload.exp === "number" && parsedPayload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

async function persistSession(token: string, user: AuthUser): Promise<void> {
  invalidateCache();
  await AsyncStorage.multiSet([
    [TOKEN_STORAGE_KEY, token],
    [USER_STORAGE_KEY, JSON.stringify(user)],
  ]);
  setAuthToken(token);
}

async function clearPersistedSession(): Promise<void> {
  invalidateCache();
  await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  setAuthToken(null);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const googleSignInHint = getGoogleSignInAvailabilityMessage();
  const googleSignInAvailable = googleSignInHint === null;

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await AsyncStorage.multiGet([
          TOKEN_STORAGE_KEY,
          USER_STORAGE_KEY,
        ]);
        const storedEntries = Object.fromEntries(storedSession);
        const storedToken = storedEntries[TOKEN_STORAGE_KEY] ?? null;
        const storedUser = storedEntries[USER_STORAGE_KEY];

        if (!isStoredToken(storedToken) || isTokenExpired(storedToken) || !storedUser) {
          await clearPersistedSession();
          return;
        }

        const parsedUser = JSON.parse(storedUser) as unknown;

        if (!isAuthUser(parsedUser)) {
          await clearPersistedSession();
          return;
        }

        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        await clearPersistedSession();
      } finally {
        setInitializing(false);
      }
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearPersistedSession();
      setToken(null);
      setUser(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(payload: LoginPayload): Promise<void> {
    setLoading(true);

    try {
      const response = await authService.login(payload);

      const accessToken = response.accessToken ?? response.token;

      if (!accessToken || !response.user) {
        throw new Error("Login failed. Please try again.");
      }

      await persistSession(accessToken, response.user);
      setToken(accessToken);
      setUser(response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function register(payload: RegisterPayload): Promise<string> {
    setLoading(true);

    try {
      const response = await authService.register(payload);

      if (!response.success) {
        throw new Error(response.message ?? "Registration failed. Please try again.");
      }

      return response.message ?? "Registration successful. Please login to continue.";
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(payload: ForgotPasswordPayload): Promise<string> {
    setLoading(true);

    try {
      const response = await authService.forgotPassword(payload);

      if (!response.success) {
        throw new Error(response.message ?? "Unable to send a reset link right now.");
      }

      return response.message ?? "If your email exists, a reset link has been sent";
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(payload: ResetPasswordPayload): Promise<string> {
    setLoading(true);

    try {
      const response = await authService.resetPassword(payload);

      if (!response.success) {
        throw new Error(response.message ?? "Unable to reset your password right now.");
      }

      return response.message ?? "Password has been reset successfully.";
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle(idToken?: string): Promise<void> {
    setLoading(true);

    try {
      const response = await authService.signInWithGoogle(idToken);

      if (!response) {
        return;
      }

      const accessToken = response.accessToken ?? response.token;

      if (!accessToken || !response.user) {
        throw new Error("Google login failed. Please try again.");
      }

      await persistSession(accessToken, response.user);
      setToken(accessToken);
      setUser(response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setLoading(true);

    try {
      await authService.signOutFromGoogle();
      await clearPersistedSession();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initializing,
        login,
        forgotPassword,
        resetPassword,
        signInWithGoogle,
        register,
        logout,
        googleSignInAvailable,
        googleSignInHint,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
