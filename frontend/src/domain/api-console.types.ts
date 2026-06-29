export type ConsoleTab = "citizen" | "profile" | "officer" | "output";
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type Language = "English" | "Nepali";

export interface SessionState {
  citizenToken: string;
  citizenRefreshToken: string;
  officerToken: string;
  officerRefreshToken: string;
}

export interface StatusState {
  message: string;
  tone: "idle" | "success" | "error";
}

export interface CitizenLoginForm {
  email: string;
  password: string;
}

export interface CitizenRegisterForm {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface PasswordResetForm {
  email: string;
  token: string;
  password: string;
}

export interface ProfileForm {
  name: string;
  phone: string;
  avatarUrl: string;
  isPublic: boolean;
  language: Language;
  currentPassword: string;
  newPassword: string;
}

export interface OfficerLoginForm {
  email: string;
  password: string;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
}

export interface ApiEnvelope {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}
