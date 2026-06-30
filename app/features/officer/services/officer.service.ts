import { apiClient } from "../../../utils/api";
import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  OfficerComplaintDetailResponse,
  OfficerComplaintListResponse,
  OfficerDashboardResponse,
  OfficerDirectoryItem,
  OfficerNotificationPreferences,
  OfficerProfile,
  OfficerUser,
} from "../types/officer.types";

export interface ComplaintQueueParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: ComplaintStatus | "";
  category?: ComplaintCategory | "";
  priority?: ComplaintPriority | "";
  ward?: string;
  department?: string;
  assignedOfficer?: string;
  sort?: "newest" | "oldest" | "highest_priority" | "ai_confidence";
}

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  ward?: string;
  category?: ComplaintCategory | "";
}

export async function getDashboard(): Promise<OfficerDashboardResponse> {
  const { data } = await apiClient.get<OfficerDashboardResponse>("/api/v1/officer/dashboard");
  return data;
}

export async function getComplaints(
  params: ComplaintQueueParams,
): Promise<OfficerComplaintListResponse> {
  const { data } = await apiClient.get<OfficerComplaintListResponse>("/api/v1/officer/complaints", {
    params,
  });
  return data;
}

export async function getComplaintDetail(
  complaintId: string,
): Promise<OfficerComplaintDetailResponse> {
  const { data } = await apiClient.get<OfficerComplaintDetailResponse>(
    `/api/v1/officer/complaints/${complaintId}`,
  );
  return data;
}

export async function listOfficers(search?: string): Promise<OfficerDirectoryItem[]> {
  const { data } = await apiClient.get<{ success: boolean; officers: OfficerDirectoryItem[] }>(
    "/api/v1/officer/officers",
    { params: { search } },
  );
  return data.officers;
}

export async function assignComplaint(complaintId: string, officerId: string): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/assign`, { officerId });
}

export async function removeComplaintAssignment(complaintId: string): Promise<void> {
  await apiClient.delete(`/api/v1/officer/complaints/${complaintId}/assign`);
}

export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  reason?: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/status`, { status, reason });
}

export async function runComplaintAction(
  complaintId: string,
  action: "accept" | "start" | "resolve" | "reject" | "reopen",
  reason?: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/${action}`, { reason });
}

export async function updateComplaintDepartment(
  complaintId: string,
  department: string,
  reason?: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/department`, {
    department,
    reason,
  });
}

export async function updateComplaintPriority(
  complaintId: string,
  priority: ComplaintPriority,
  reason?: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/priority`, {
    priority,
    reason,
  });
}

export async function addInternalNote(complaintId: string, note: string): Promise<void> {
  await apiClient.post(`/api/v1/officer/complaints/${complaintId}/notes`, { note });
}

export async function editInternalNote(
  complaintId: string,
  noteId: string,
  note: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/officer/complaints/${complaintId}/notes/${noteId}`, { note });
}

export async function deleteInternalNote(complaintId: string, noteId: string): Promise<void> {
  await apiClient.delete(`/api/v1/officer/complaints/${complaintId}/notes/${noteId}`);
}

export async function addOfficialResponse(complaintId: string, body: string): Promise<void> {
  await apiClient.post(`/api/v1/officer/complaints/${complaintId}/comments`, { body });
}

export async function editOfficialResponse(
  complaintId: string,
  commentId: string,
  body: string,
): Promise<void> {
  await apiClient.patch(`/api/v1/complaints/${complaintId}/comments/${commentId}`, { body });
}

export async function deleteOfficialResponse(
  complaintId: string,
  commentId: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/complaints/${complaintId}/comments/${commentId}`);
}

export async function getAnalytics(filters: AnalyticsFilters) {
  const { data } = await apiClient.get("/api/v1/officer/analytics", { params: filters });
  return data.analytics ?? data;
}

export async function listUsers(params: {
  search?: string;
  status?: "active" | "banned" | "";
  ward?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get<{
    success: boolean;
    users: OfficerUser[];
    total: number;
    page: number;
    limit: number;
  }>("/api/v1/officer/users", { params });
  return data;
}

export async function getUserDetail(userId: string) {
  const { data } = await apiClient.get<{
    success: boolean;
    user: OfficerUser;
    complaints: unknown[];
    warnings: unknown[];
  }>(`/api/v1/officer/users/${userId}`);
  return data;
}

export async function warnUser(userId: string, reason: string): Promise<void> {
  await apiClient.post(`/api/v1/officer/users/${userId}/warn`, { reason });
}

export async function banUser(userId: string, reason: string): Promise<void> {
  await apiClient.patch(`/api/v1/officer/users/${userId}/ban`, { reason });
}

export async function unbanUser(userId: string): Promise<void> {
  await apiClient.patch(`/api/v1/officer/users/${userId}/unban`);
}

export async function getSettings() {
  const { data } = await apiClient.get<{ success: boolean; officer: OfficerProfile; settings: OfficerProfile }>(
    "/api/v1/officer/settings",
  );
  return data.officer ?? data.settings;
}

export async function updateSettings(payload: {
  name?: string;
  phone?: string;
  department?: string;
  ward?: string;
  city?: string;
  currentPassword?: string;
  newPassword?: string;
  notificationPreferences?: OfficerNotificationPreferences;
}) {
  const { data } = await apiClient.patch<{ success: boolean; officer: OfficerProfile }>(
    "/api/v1/officer/settings",
    payload,
  );
  return data.officer;
}

export async function listSessions() {
  const { data } = await apiClient.get<{ success: boolean; sessions: Array<Record<string, unknown>> }>(
    "/api/v1/officer/auth/sessions",
  );
  return data.sessions;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/officer/auth/sessions/${sessionId}`);
}

export async function listEscalationRules() {
  const { data } = await apiClient.get<{ success: boolean; rules: Array<Record<string, unknown>> }>(
    "/api/v1/officer/escalation-rules",
  );
  return data.rules;
}

export async function saveEscalationRule(rule: Record<string, unknown>): Promise<void> {
  if (typeof rule.id === "string" || typeof rule._id === "string") {
    await apiClient.patch(`/api/v1/officer/escalation-rules/${rule.id ?? rule._id}`, rule);
    return;
  }

  await apiClient.post("/api/v1/officer/escalation-rules", rule);
}
