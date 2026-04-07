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

  const envBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envBaseUrl) {
    return sanitizeBaseUrl(envBaseUrl);
  }

  const expoHost = getExpoHost();

  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return `http://${expoHost}:${API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const baseURL = resolveBaseURL();

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

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

export { baseURL };
