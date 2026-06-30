import type { Types } from "mongoose";

export const USER_ROLES = ["citizen", "officer", "supervisor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CITIZEN_ROLES = ["citizen", "admin"] as const;
export type CitizenRole = (typeof CITIZEN_ROLES)[number];

export const OFFICER_ROLES = ["officer", "supervisor", "admin"] as const;
export type OfficerRole = (typeof OFFICER_ROLES)[number];

export const COMPLAINT_CATEGORIES = [
  "road",
  "water",
  "power",
  "waste",
  "trees",
  "other",
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "resolved",
  "rejected",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export const COMMENT_AUTHOR_TYPES = ["citizen", "officer"] as const;
export type CommentAuthorType = (typeof COMMENT_AUTHOR_TYPES)[number];

export const SUBJECT_TYPES = ["citizen", "officer"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export interface WardLocation {
  lat?: number;
  lng?: number;
  address?: string;
  area?: string;
  ward?: string;
  wardId?: string;
  wardName?: string;
  wardNumber?: string;
  city?: string;
  municipality?: string;
  province?: string;
}

export interface User {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: CitizenRole;
  ward?: string;
  wardId?: string;
  homeArea?: string;
  address?: string;
  city?: string;
  municipality?: string;
  location?: WardLocation;
  language: "English" | "Nepali";
  isPublic: boolean;
  isBanned: boolean;
  banReason?: string;
  points: number;
  level: number;
  levelTitle: string;
  googleId?: string;
  isGoogleUser: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Officer {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: OfficerRole;
  ward?: string;
  wardId?: string;
  wardNumber?: string;
  city?: string;
  municipality?: string;
  department: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintLocation extends WardLocation {}

export interface ComplaintAiAnalysis {
  // Snake-case fields are stored for the database/reporting contract requested by the AI task.
  detected_category: ComplaintCategory;
  confidence_score: number;
  severity: "low" | "medium" | "high" | "critical";
  estimated_resolution_days: number;
  duplicate_probability: number;
  // Camel-case fields are kept so existing controllers and mobile screens do not need to change.
  detectedCategory: ComplaintCategory;
  confidence: number;
  severityLabel: "low" | "medium" | "high" | "critical";
  sizeEstimate?: string;
  priority: ComplaintPriority;
  department: string;
  etaDays: number;
  duplicateCheck: {
    isDuplicate: boolean;
    complaintId?: string;
    complaintNo?: string;
    title?: string;
    distanceMeters?: number;
    probability?: number;
  };
  verified: boolean;
  summary: string;
  keywords: string[];
  analyzedAt: Date;
}

export interface Complaint {
  userId: Types.ObjectId | string;
  complaintNo: string;
  title: string;
  description: string;
  location?: ComplaintLocation;
  photos: string[];
  photo?: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  calculatedPriority?: ComplaintPriority;
  priorityScore?: number;
  priorityReasons: string[];
  priorityOverriddenBy?: Types.ObjectId | string;
  priorityOverriddenAt?: Date;
  priorityOverrideReason?: string;
  duplicateOfComplaintId?: Types.ObjectId | string;
  duplicateSimilarityScore?: number;
  duplicateCheckedAt?: Date;
  aiAnalysis?: ComplaintAiAnalysis;
  aiVerified: boolean;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords: string[];
  embedding: number[];
  assignedOfficerId?: Types.ObjectId | string;
  assignedOfficerName?: string;
  assignedDepartment?: string;
  departmentOverriddenBy?: Types.ObjectId | string;
  departmentOverriddenAt?: Date;
  departmentOverrideReason?: string;
  rejectionReason?: string;
  resolutionNote?: string;
  upvoteCount: number;
  commentCount: number;
  followerCount: number;
  ratingAverage?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  ward?: string;
  wardId?: string;
  address?: string;
  city?: string;
  municipality?: string;
  homeArea?: string;
  location?: WardLocation;
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
  photos?: string[];
  category: ComplaintCategory;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
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
  photos?: string[];
  category?: ComplaintCategory;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords?: string[];
  embedding?: number[];
}

export interface ComplaintFilterDto {
  ward?: string;
  wardId?: string;
  city?: string;
  category?: ComplaintCategory;
  status?: ComplaintStatus;
  priority?: ComplaintPriority | "high";
  page?: number;
  limit?: number;
  sort?: "newest" | "upvotes" | "nearby";
}

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
  department?: string;
  isGoogleUser?: boolean;
  avatarUrl?: string;
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
}

export interface JwtUserPayload {
  userId: string;
  subjectId: string;
  email: string;
  role: UserRole;
  type: SubjectType;
  tokenType?: "access";
  iat?: number;
  exp?: number;
}

export interface ComplaintPayload {
  id: string;
  userId: string;
  complaintNo: string;
  title: string;
  description: string;
  location?: ComplaintLocation;
  photo?: string;
  photos: string[];
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  calculatedPriority?: ComplaintPriority;
  priorityScore?: number;
  priorityReasons: string[];
  priorityOverriddenBy?: string;
  priorityOverriddenAt?: Date;
  priorityOverrideReason?: string;
  duplicateOfComplaintId?: string;
  duplicateSimilarityScore?: number;
  duplicateCheckedAt?: Date;
  progress: number;
  aiAnalysis?: ComplaintAiAnalysis;
  aiVerified: boolean;
  aiSuggestedCategory?: string;
  aiSeverity?: number;
  aiSummary?: string;
  aiKeywords: string[];
  embedding: number[];
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedDepartment?: string;
  departmentOverriddenBy?: string;
  departmentOverriddenAt?: Date;
  departmentOverrideReason?: string;
  rejectionReason?: string;
  resolutionNote?: string;
  upvotes: number;
  comments: number;
  followers: number;
  followed?: boolean;
  distanceKm?: number;
  etaDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintResponse {
  success: boolean;
  complaint?: ComplaintPayload;
  message?: string;
}

export interface ComplaintsResponse {
  success: boolean;
  complaints?: ComplaintPayload[];
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
}

export interface UploadPhotoResponse {
  success: boolean;
  photoUrl?: string;
  photoUrls?: string[];
  message?: string;
}
