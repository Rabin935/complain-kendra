export type OfficerRole = "officer" | "supervisor" | "admin";
export type ComplaintStatus = "pending" | "accepted" | "in_progress" | "resolved" | "rejected";
export type ComplaintPriority = "low" | "medium" | "high" | "critical";
export type ComplaintCategory = "road" | "water" | "power" | "waste" | "trees" | "other";

export interface OfficerProfile {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: OfficerRole;
  phone?: string;
  ward?: string;
  wardId?: string;
  city?: string;
  municipality?: string;
  department?: string;
  avatarUrl?: string;
  notificationPreferences?: OfficerNotificationPreferences;
}

export interface OfficerNotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  assignmentUpdates: boolean;
  urgentAlerts: boolean;
  dailyDigest: boolean;
}

export interface OfficerComplaint {
  id: string;
  complaintNo: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
    area?: string;
    ward?: string;
    wardId?: string;
    city?: string;
    municipality?: string;
  };
  photos: string[];
  photo?: string;
  progress: number;
  priorityScore?: number;
  priorityReasons: string[];
  aiAnalysis?: {
    detectedCategory?: ComplaintCategory;
    confidence?: number;
    confidence_score?: number;
    severity?: ComplaintPriority;
    severityLabel?: ComplaintPriority;
    department?: string;
    etaDays?: number;
    summary?: string;
    keywords?: string[];
  };
  ai?: {
    verified: boolean;
    suggestedCategory?: string;
    severity?: number;
    summary?: string;
    keywords: string[];
  };
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedDepartment?: string;
  rejectionReason?: string;
  resolutionNote?: string;
  upvotes: number;
  comments: number;
  followers: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerTimelineItem {
  _id: string;
  id?: string;
  type: string;
  title: string;
  message?: string;
  actorType: "system" | "citizen" | "officer";
  actorId?: string;
  actorName?: string;
  isInternal: boolean;
  createdAt: string;
}

export interface OfficerComment {
  id?: string;
  _id?: string;
  authorType: "citizen" | "officer";
  authorId: string;
  authorName: string;
  body: string;
  official: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerDashboardResponse {
  success: boolean;
  officer: OfficerProfile;
  kpis: {
    total: number;
    pending: number;
    in_progress: number;
    resolved_today: number;
    high_priority: number;
    assigned_to_me: number;
  };
  recentComplaints: OfficerComplaint[];
  urgentQueue: OfficerComplaint[];
  recentActivity: OfficerTimelineItem[];
}

export interface OfficerComplaintListResponse {
  success: boolean;
  complaints: OfficerComplaint[];
  total: number;
  page: number;
  limit: number;
}

export interface OfficerComplaintDetailResponse {
  success: boolean;
  complaint: OfficerComplaint;
  timeline: OfficerTimelineItem[];
  comments: OfficerComment[];
}

export interface OfficerDirectoryItem {
  id: string;
  name: string;
  email: string;
  role: OfficerRole;
  ward?: string;
  department?: string;
}

export interface OfficerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ward?: string;
  points: number;
  level: number;
  levelTitle?: string;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
}

export interface OfficerStackParamList {
  OfficerTabs: undefined;
  OfficerComplaintDetail: {
    complaintId: string;
  };
  OfficerUserDetail: {
    userId: string;
  };
}

export type OfficerComplaintDetailProps = {
  route?: {
    params?: {
      complaintId?: string;
    };
  };
};

export type OfficerTabParamList = {
  OfficerDashboard: undefined;
  OfficerQueue: {
    status?: ComplaintStatus;
    priority?: ComplaintPriority | "high";
    assignedToMe?: boolean;
  } | undefined;
  OfficerAnalytics: undefined;
  OfficerUsers: undefined;
  OfficerSettings: undefined;
};
