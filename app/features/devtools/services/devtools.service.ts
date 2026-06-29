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
  const storedEntries = await AsyncStorage.multiGet([
    SESSION_KEYS.citizenToken,
    SESSION_KEYS.citizenRefreshToken,
    SESSION_KEYS.officerToken,
    SESSION_KEYS.officerRefreshToken,
  ]);
  const sessionMap = Object.fromEntries(storedEntries);

  return {
    citizenToken: sessionMap[SESSION_KEYS.citizenToken] ?? "",
    citizenRefreshToken: sessionMap[SESSION_KEYS.citizenRefreshToken] ?? "",
    officerToken: sessionMap[SESSION_KEYS.officerToken] ?? "",
    officerRefreshToken: sessionMap[SESSION_KEYS.officerRefreshToken] ?? "",
  };
}

export async function saveDevConsoleSession(
  session: DevConsoleSessionState,
): Promise<void> {
  await AsyncStorage.multiSet([
    [SESSION_KEYS.citizenToken, session.citizenToken],
    [SESSION_KEYS.citizenRefreshToken, session.citizenRefreshToken],
    [SESSION_KEYS.officerToken, session.officerToken],
    [SESSION_KEYS.officerRefreshToken, session.officerRefreshToken],
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
