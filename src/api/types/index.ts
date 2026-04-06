export type UserRole = "user" | "admin";

export interface User {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
