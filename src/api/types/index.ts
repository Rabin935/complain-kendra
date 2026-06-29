import type { Types } from "mongoose";

export type UserRole = "user" | "admin";

export const COMPLAINT_CATEGORIES = [
  "Road Damage",
  "Garbage",
  "Water Supply",
  "Electricity",
  "Drainage",
  "Other",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_STATUSES = ["Pending", "In Progress", "Resolved"] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

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

export interface ComplaintLocation {
  lat?: number;
  lng?: number;
  address?: string;
  ward?: string;
  wardId?: string;
  wardName?: string;
}

export const TIMELINE_EVENT_TYPES = [
  "complaint_created",
  "ai_analysis_started",
  "ai_analysis_completed",
  "assigned",
  "status_changed",
  "resolved",
  "rejected",
  "comment_added",
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface Complaint {
  userId: Types.ObjectId | string;
  title: string;
  description: string;
  location?: ComplaintLocation;
  photo?: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords: string[];
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
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

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface CreateComplaintDto {
  title: string;
  description: string;
  location?: ComplaintLocation;
  photo?: string;
  category: ComplaintCategory;
  status?: ComplaintStatus;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords?: string[];
  embedding?: number[];
}

export interface UpdateComplaintDto {
  title?: string;
  description?: string;
  location?: ComplaintLocation;
  photo?: string;
  category?: ComplaintCategory;
  status?: ComplaintStatus;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords?: string[];
  embedding?: number[];
}

export interface ComplaintFilterDto {
  ward?: string;
  category?: ComplaintCategory;
  status?: ComplaintStatus;
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

export interface ComplaintPayload {
  id: string;
  userId: string;
  title: string;
  description: string;
  location?: ComplaintLocation;
  photo?: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords: string[];
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintTimelineEvent {
  id: string;
  complaintId: string;
  type: TimelineEventType;
  title: string;
  message?: string;
  actorType: "system" | "citizen" | "officer";
  actorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ComplaintResponse {
  success: boolean;
  complaint?: ComplaintPayload;
  message?: string;
}

export interface ComplaintsResponse {
  success: boolean;
  complaints?: ComplaintPayload[];
  message?: string;
}

export interface ComplaintTimelineResponse {
  success: boolean;
  timeline?: ComplaintTimelineEvent[];
  message?: string;
}

export interface UploadPhotoResponse {
  success: boolean;
  photoUrl?: string;
  message?: string;
}
