import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = "5000";

function sanitizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function getExpoHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(":")[0] ?? null;
}

function getHostnameFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isPrivateIpv4Host(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return parts[0] === 192 && parts[1] === 168;
}

function getWebBaseURL(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_URL_WEB?.trim();

  if (envBaseUrl) {
    return sanitizeBaseUrl(envBaseUrl);
  }

  if (typeof window !== "undefined" && window.location.hostname) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

function resolveBaseURL(): string {
  if (Platform.OS === "web") {
    return getWebBaseURL();
  }

  const expoHost = getExpoHost();

  const envBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envBaseUrl) {
    const sanitizedBaseUrl = sanitizeBaseUrl(envBaseUrl);
    const envHost = getHostnameFromUrl(sanitizedBaseUrl);
    const shouldUseExpoHostInDev =
      __DEV__ &&
      !!expoHost &&
      !!envHost &&
      envHost !== expoHost &&
      isPrivateIpv4Host(envHost);

    if (shouldUseExpoHostInDev) {
      return `http://${expoHost}:${API_PORT}`;
    }

    return sanitizedBaseUrl;
  }

  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return `http://${expoHost}:${API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const baseURL = resolveBaseURL();
let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let handlingUnauthorized = false;

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

function isAuthRoute(url?: string): boolean {
  return Boolean(
    url &&
      (
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/google") ||
        url.includes("/auth/forgot-password") ||
        url.includes("/auth/reset-password") ||
        url.includes("/auth/send-otp") ||
        url.includes("/auth/verify-otp")
      ),
  );
}

function hasAuthorizationHeader(headers: unknown): boolean {
  if (!headers || typeof headers !== "object") {
    return false;
  }

  const record = headers as Record<string, unknown>;
  return Boolean(record.Authorization ?? record.authorization);
}

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthRoute(error.config?.url) &&
      (hasAuthorizationHeader(error.config?.headers) || hasAuthorizationHeader(apiClient.defaults.headers.common)) &&
      unauthorizedHandler &&
      !handlingUnauthorized
    ) {
      handlingUnauthorized = true;

      try {
        await unauthorizedHandler();
      } finally {
        handlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.code === "ECONNABORTED") {
      return `Request timed out while reaching ${baseURL}. Make sure the backend is running on port ${API_PORT}.`;
    }

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      return `Unable to connect to ${baseURL}. Make sure the backend is running on port ${API_PORT}.`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function withApiRetry<T>(
  request: () => Promise<T>,
  retries = 1,
  delayMs = 450,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withApiRetry(request, retries - 1, delayMs * 2);
  }
}

export { baseURL };
