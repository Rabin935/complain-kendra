export type UserRole = "user" | "admin";

export interface User {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  googleId?: string;
  isGoogleUser: boolean;
  avatarUrl?: string;
  createdAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  googleId?: string;
  isGoogleUser?: boolean;
  avatarUrl?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface GoogleLoginDto {
  idToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isGoogleUser?: boolean;
  avatarUrl?: string;
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
