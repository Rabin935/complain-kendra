export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
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
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string>;
  logout: () => Promise<void>;
}

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};
