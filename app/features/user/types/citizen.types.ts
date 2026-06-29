export type CitizenComplaintCategory = "road" | "water" | "power" | "waste" | "trees" | "other";

export type CitizenComplaintStatus = "pending" | "in_progress" | "resolved" | "rejected";

export type CitizenComplaintPriority = "normal" | "high" | "critical";

export interface CitizenLocation {
  address: string;
  area: string;
  ward: string;
  wardId: string;
  city: string;
  lat: number;
  lng: number;
}

export interface CitizenProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  location: CitizenLocation;
  level: number;
  levelTitle: string;
  points: number;
  language: "English" | "Nepali";
  isPublic: boolean;
  avatarUrl?: string;
}

export interface CitizenStats {
  pending: number;
  inProgress: number;
  resolved: number;
  wardTotal: number;
  reportsSubmitted: number;
  upvotesReceived: number;
  badgesEarned: number;
}

export interface ComplaintTimelineItem {
  label: string;
  at: string;
  done: boolean;
}

export interface ComplaintComment {
  id: string;
  authorName: string;
  authorType: "citizen" | "officer";
  official: boolean;
  body: string;
  upvoteCount: number;
  createdAt: string;
}

export interface CitizenComplaint {
  id: string;
  complaintNo: string;
  title: string;
  description: string;
  category: CitizenComplaintCategory;
  status: CitizenComplaintStatus;
  priority: CitizenComplaintPriority;
  progress: number;
  location: CitizenLocation;
  createdAt: string;
  updatedAt: string;
  distanceKm: number;
  upvotes: number;
  comments: number;
  followers: number;
  followed: boolean;
  photos: string[];
  reporterName?: string;
  reporterPrivate?: boolean;
  timeline: ComplaintTimelineItem[];
  etaDays?: number;
  aiAnalysis?: AiAnalysisResult;
  aiVerified?: boolean;
  aiSummary?: string;
}

export interface ComplaintDetailPayload {
  complaint: CitizenComplaint;
  timeline: ComplaintTimelineItem[];
  comments: ComplaintComment[];
}

export interface CitizenNotification {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
}

export interface CitizenBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
}

export interface AiAnalysisResult {
  verified: boolean;
  confidence: number;
  detectedCategory: CitizenComplaintCategory;
  severityLabel: string;
  sizeEstimate?: string;
  priority: CitizenComplaintPriority;
  department: string;
  etaDays: number;
  summary?: string;
  keywords?: string[];
  duplicateCheck: {
    isDuplicate: boolean;
    complaintNo?: string;
    title?: string;
    distanceMeters?: number;
  };
}

export interface ReportPhoto {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface CreateReportPayload {
  category: CitizenComplaintCategory;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  area: string;
  ward: string;
  wardId: string;
  city: string;
  photos: ReportPhoto[];
}

export interface CitizenServiceResult<T> {
  data: T;
  source: "api" | "sample";
  error?: string;
}
