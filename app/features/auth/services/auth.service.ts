import { apiClient } from "../../../utils/api";
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types/auth.types";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", payload);

  if (data.token && data.user) {
    return data;
  }

  const authenticatedSession = await login({
    email: payload.email,
    password: payload.password,
  });

  return {
    ...authenticatedSession,
    message: data.message ?? authenticatedSession.message,
  };
}
