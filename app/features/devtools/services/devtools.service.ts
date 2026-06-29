import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, getApiErrorMessage } from "../../../utils/api";
import type {
  DevConsoleResponse,
  DevConsoleSessionState,
} from "../types/devtools.types";

const SESSION_KEYS = {
  citizenRefreshToken: "dev-console:citizen-refresh",
  citizenToken: "dev-console:citizen-token",
  officerRefreshToken: "dev-console:officer-refresh",
  officerToken: "dev-console:officer-token",
} as const;

export async function loadDevConsoleSession(): Promise<DevConsoleSessionState> {
  const [
    citizenToken,
    citizenRefreshToken,
    officerToken,
    officerRefreshToken,
  ] = await Promise.all([
    AsyncStorage.getItem(SESSION_KEYS.citizenToken),
    AsyncStorage.getItem(SESSION_KEYS.citizenRefreshToken),
    AsyncStorage.getItem(SESSION_KEYS.officerToken),
    AsyncStorage.getItem(SESSION_KEYS.officerRefreshToken),
  ]);

  return {
    citizenToken: citizenToken ?? "",
    citizenRefreshToken: citizenRefreshToken ?? "",
    officerToken: officerToken ?? "",
    officerRefreshToken: officerRefreshToken ?? "",
  };
}

export async function saveDevConsoleSession(
  session: DevConsoleSessionState,
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(SESSION_KEYS.citizenToken, session.citizenToken),
    AsyncStorage.setItem(SESSION_KEYS.citizenRefreshToken, session.citizenRefreshToken),
    AsyncStorage.setItem(SESSION_KEYS.officerToken, session.officerToken),
    AsyncStorage.setItem(SESSION_KEYS.officerRefreshToken, session.officerRefreshToken),
  ]);
}

export async function requestDevConsole(
  path: string,
  options: {
    token?: string;
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Record<string, string | number | undefined>;
  } = {},
): Promise<DevConsoleResponse> {
  try {
    const response = await apiClient.request<DevConsoleResponse>({
      url: path,
      method: options.method ?? "GET",
      data: options.body,
      params: options.params,
      headers: options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : undefined,
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
