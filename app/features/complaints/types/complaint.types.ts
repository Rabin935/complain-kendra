export type ComplaintCategory = "Road Damage" | "Garbage" | "Water Supply" | "Electricity" | "Drainage" | "Other";
export type ComplaintStatus = "Pending" | "In Progress" | "Resolved";

export interface ComplaintLocation {
  lat?: number;
  lng?: number;
  address?: string;
  ward?: string;
}

export interface Complaint {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintData {
  title: string;
  description: string;
  category: ComplaintCategory;
  location?: ComplaintLocation;
  photo?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    suggestedTitle: string;
    category: string;
    severity: number;
    summary: string;
    keywords: string[];
  };
  message?: string;
}

export interface ComplaintsListResponse {
  success: boolean;
  complaints: Complaint[];
  total: number;
  message?: string;
}

export interface ComplaintResponse {
  success: boolean;
  complaint?: Complaint;
  message?: string;
}

export type ComplaintTabParamList = {
  CreateComplaint: undefined;
  MyComplaints: undefined;
  BrowseComplaints: undefined;
};
