export type UserRole = "citizen" | "officer" | "supervisor" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  ward?: string;
  wardId?: string;
  city?: string;
  municipality?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  ward?: string;
  wardId?: string;
  city: string;
  municipality?: string;
  homeArea?: string;
  address?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface SendOtpResponse extends AuthResponse {
  devOtp?: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AuthFormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface AuthFormProps {
  mode: "login" | "register";
  loading: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AuthFormValues) => Promise<void>;
  onToggleMode: () => void;
  onForgotPassword?: () => void;
  onGoogleSignIn?: (idToken?: string) => Promise<void>;
  googleSignInHint?: string | null;
  googleNote?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<string>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  signInWithGoogle: (idToken?: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string>;
  logout: () => Promise<void>;
  googleSignInAvailable: boolean;
  googleSignInHint: string | null;
}

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OtpVerification: {
    email: string;
    message?: string;
    devOtp?: string;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    token?: string;
  } | undefined;
};
