export type DevConsoleTab = "citizen" | "complaints" | "profile" | "officer" | "output";

export interface DevConsoleSessionState {
  citizenToken: string;
  citizenRefreshToken: string;
  officerToken: string;
  officerRefreshToken: string;
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

export interface ComplaintForm {
  title: string;
  category: string;
  description: string;
  ward: string;
  address: string;
  complaintId: string;
  comment: string;
}

export interface ProfileForm {
  name: string;
  phone: string;
  language: "English" | "Nepali";
  avatarUrl: string;
  isPublic: boolean;
}

export interface OfficerLoginForm {
  email: string;
  password: string;
}

export interface OfficerActionForm {
  complaintId: string;
  status: "pending" | "in_progress" | "resolved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  note: string;
}

export interface DevConsoleStatusState {
  message: string;
  tone: "idle" | "success" | "error";
}

export interface DevConsoleResponse {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  complaint?: {
    id?: string;
    _id?: string;
  };
  complaints?: Array<{
    id?: string;
    _id?: string;
    complaintNo?: string;
    title?: string;
    status?: string;
    priority?: string;
  }>;
  [key: string]: unknown;
}
