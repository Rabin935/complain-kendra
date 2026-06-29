export type UserRole = "user" | "admin";
export type OfficerRole = "officer" | "supervisor" | "admin";
export type AccountType = "user" | "officer";

export interface User {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface Officer {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: OfficerRole;
  ward?: string;
  department?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface OfficerLoginDto {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: Date;
}

export interface AuthOfficer {
  id: string;
  name: string;
  email: string;
  role: OfficerRole;
  phone?: string;
  ward?: string;
  department?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  officer?: AuthOfficer;
  message?: string;
}

export interface JwtUserPayload {
  userId: string;
  officerId?: string;
  type?: AccountType;
  email: string;
  role: UserRole | OfficerRole;
  iat?: number;
  exp?: number;
}
