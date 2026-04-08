import { apiClient } from "../../../utils/api";
import type {
  AuthResponse,
  GoogleLoginPayload,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", payload);
  return data;
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/google", payload);
  return data;
}
