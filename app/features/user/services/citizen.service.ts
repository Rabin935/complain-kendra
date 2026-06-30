import { apiClient, getApiErrorMessage } from "../../../utils/api";
import {
  sampleAiAnalysis,
  sampleBadges,
  sampleNotifications,
  sampleProfile,
  sampleStats,
} from "../data/citizenSampleData";
import type {
  AiAnalysisResult,
  CitizenBadge,
  CitizenComplaint,
  CitizenComplaintCategory,
  CitizenComplaintStatus,
  ComplaintComment,
  ComplaintDetailPayload,
  ComplaintTimelineItem,
  CitizenNotification,
  CitizenProfile,
  CitizenServiceResult,
  CitizenStats,
  CreateReportPayload,
} from "../types/citizen.types";

const API_PREFIX = "/api/v1";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unwrapRecord(value: unknown): UnknownRecord {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.data)) {
    return value.data;
  }

  if (isRecord(value.user)) {
    return value.user;
  }

  if (isRecord(value.profile)) {
    return value.profile;
  }

  return value;
}

function unwrapArray<T>(value: unknown, key: string, fallback: T[]): T[] {
  if (!isRecord(value)) {
    return fallback;
  }

  const direct = value[key];

  if (Array.isArray(direct)) {
    return direct as T[];
  }

  if (isRecord(value.data) && Array.isArray(value.data[key])) {
    return value.data[key] as T[];
  }

  return fallback;
}

async function withSampleFallback<T>(
  request: () => Promise<T>,
  fallback: T,
): Promise<CitizenServiceResult<T>> {
  try {
    return {
      data: await request(),
      source: "api",
    };
  } catch (error) {
    return {
      data: fallback,
      source: "sample",
      error: getApiErrorMessage(error),
    };
  }
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringFrom(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function booleanFrom(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeProfile(payload: unknown): CitizenProfile {
  const user = unwrapRecord(payload);
  const location = isRecord(user.location) ? user.location : {};

  const name = stringFrom(user.name, sampleProfile.name);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    ...sampleProfile,
    id: stringFrom(user.id ?? user._id, sampleProfile.id),
    name,
    email: stringFrom(user.email, sampleProfile.email),
    phone: stringFrom(user.phone, sampleProfile.phone),
    initials: initials || sampleProfile.initials,
    avatarUrl: stringFrom(user.avatarUrl, sampleProfile.avatarUrl ?? ""),
    language: stringFrom(user.language, sampleProfile.language) === "Nepali" ? "Nepali" : "English",
    isPublic: booleanFrom(user.is_public ?? user.isPublic, sampleProfile.isPublic),
    level: numberFrom(user.level, sampleProfile.level),
    levelTitle: stringFrom(user.level_title ?? user.levelTitle, sampleProfile.levelTitle),
    points: numberFrom(user.points, sampleProfile.points),
    location: {
      ...sampleProfile.location,
      address: stringFrom(location.address, sampleProfile.location.address),
      area: stringFrom(location.area, sampleProfile.location.area),
      ward: stringFrom(location.ward, sampleProfile.location.ward),
      wardId: stringFrom(location.ward_id ?? location.wardId, sampleProfile.location.wardId),
      wardName: stringFrom(location.ward_name ?? location.wardName, sampleProfile.location.wardName ?? ""),
      wardNumber: stringFrom(
        location.ward_number ?? location.wardNumber,
        sampleProfile.location.wardNumber ?? "",
      ),
      city: stringFrom(location.city, sampleProfile.location.city),
      municipality: stringFrom(
        location.municipality,
        sampleProfile.location.municipality ?? "",
      ),
      province: stringFrom(location.province, sampleProfile.location.province ?? ""),
      lat: numberFrom(location.lat, sampleProfile.location.lat),
      lng: numberFrom(location.lng, sampleProfile.location.lng),
    },
  };
}

function normalizeStats(payload: unknown): CitizenStats {
  const stats = unwrapRecord(payload);

  return {
    pending: numberFrom(stats.pending, sampleStats.pending),
    inProgress: numberFrom(stats.in_progress ?? stats.inProgress, sampleStats.inProgress),
    resolved: numberFrom(stats.resolved, sampleStats.resolved),
    wardTotal: numberFrom(stats.ward_total ?? stats.wardTotal, sampleStats.wardTotal),
    reportsSubmitted: numberFrom(
      stats.reports_submitted ?? stats.reportsSubmitted,
      sampleStats.reportsSubmitted,
    ),
    upvotesReceived: numberFrom(
      stats.upvotes_received ?? stats.upvotesReceived,
      sampleStats.upvotesReceived,
    ),
    badgesEarned: numberFrom(stats.badges_earned ?? stats.badgesEarned, sampleStats.badgesEarned),
  };
}

function getComplaintFallback(index: number): CitizenComplaint {
  return {
    id: `complaint-${index}`,
    complaintNo: "Pending",
    title: "Untitled complaint",
    description: "",
    category: "other",
    status: "pending",
    priority: "normal",
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    distanceKm: 0,
    upvotes: 0,
    comments: 0,
    followers: 0,
    followed: false,
    photos: [],
    timeline: [],
    location: sampleProfile.location,
  };
}

function normalizeComplaint(raw: unknown, index: number): CitizenComplaint {
  const item = isRecord(raw) ? raw : {};
  const sample = getComplaintFallback(index);
  const location = isRecord(item.location) ? item.location : {};

  const category = normalizeCategory(item.category, sample.category);
  const status = normalizeStatus(item.status, sample.status);

  return {
    ...sample,
    id: stringFrom(item.id ?? item._id, sample.id),
    complaintNo: stringFrom(item.complaint_no ?? item.complaintNo, sample.complaintNo),
    title: stringFrom(item.title, sample.title),
    description: stringFrom(item.description, sample.description),
    category,
    status,
    priority: normalizePriority(item.priority, sample.priority),
    progress: numberFrom(item.progress, sample.progress),
    createdAt: stringFrom(item.created_at ?? item.createdAt, sample.createdAt),
    updatedAt: stringFrom(item.updated_at ?? item.updatedAt, sample.updatedAt),
    distanceKm: numberFrom(item.distance_km ?? item.distanceKm, sample.distanceKm),
    upvotes: numberFrom(item.upvotes, sample.upvotes),
    comments: numberFrom(item.comments, sample.comments),
    followers: numberFrom(item.followers, 0),
    followed: booleanFrom(item.followed, sample.followed),
    photos: Array.isArray(item.photos) ? (item.photos as string[]) : sample.photos,
    reporterName: stringFrom(item.reporter_name ?? item.reporterName, sample.reporterName ?? ""),
    reporterPrivate: booleanFrom(item.reporter_private ?? item.reporterPrivate, Boolean(sample.reporterPrivate)),
    etaDays: numberFrom(item.eta_days ?? item.etaDays, sample.etaDays ?? 0),
    aiAnalysis: isRecord(item.aiAnalysis) ? normalizeAiAnalysis(item.aiAnalysis) : undefined,
    aiVerified: booleanFrom(item.aiVerified, false),
    aiSummary: stringFrom(item.aiSummary, ""),
    location: {
      ...sample.location,
      address: stringFrom(location.address, sample.location.address),
      area: stringFrom(location.area, sample.location.area),
      ward: stringFrom(location.ward, sample.location.ward),
      wardId: stringFrom(location.ward_id ?? location.wardId, sample.location.wardId),
      wardName: stringFrom(location.ward_name ?? location.wardName, sample.location.wardName ?? ""),
      wardNumber: stringFrom(
        location.ward_number ?? location.wardNumber,
        sample.location.wardNumber ?? "",
      ),
      city: stringFrom(location.city, sample.location.city),
      municipality: stringFrom(location.municipality, sample.location.municipality ?? ""),
      province: stringFrom(location.province, sample.location.province ?? ""),
      lat: numberFrom(location.lat, sample.location.lat),
      lng: numberFrom(location.lng, sample.location.lng),
    },
  };
}

function normalizeTimelineItem(raw: unknown, index: number): ComplaintTimelineItem {
  const item = isRecord(raw) ? raw : {};
  const sample = {
    label: "Updated",
    at: "Just now",
    done: true,
  };

  return {
    label: stringFrom(item.title ?? item.label ?? item.type, sample.label),
    at: stringFrom(item.createdAt, sample.at),
    done: true,
  };
}

function normalizeComment(raw: unknown, index: number): ComplaintComment {
  const item = isRecord(raw) ? raw : {};

  return {
    id: stringFrom(item.id ?? item._id, `comment-${index}`),
    authorName: stringFrom(item.authorName, "Citizen"),
    authorType: stringFrom(item.authorType, "citizen") === "officer" ? "officer" : "citizen",
    official: booleanFrom(item.official, false),
    body: stringFrom(item.body, "Community update"),
    upvoteCount: numberFrom(item.upvoteCount, 0),
    createdAt: stringFrom(item.createdAt ?? item.created_at, new Date().toISOString()),
  };
}

function normalizeCategory(value: unknown, fallback: CitizenComplaintCategory): CitizenComplaintCategory {
  const normalized = stringFrom(value, fallback).toLowerCase().replace(/[_\s-]+/g, "");

  if (normalized.includes("road") || normalized.includes("infrastructure")) {
    return "road";
  }

  if (normalized.includes("water")) {
    return "water";
  }

  if (normalized.includes("power") || normalized.includes("electric")) {
    return "power";
  }

  if (normalized.includes("waste") || normalized.includes("garbage") || normalized.includes("sanitation")) {
    return "waste";
  }

  if (normalized.includes("tree")) {
    return "trees";
  }

  return fallback;
}

function normalizeStatus(value: unknown, fallback: CitizenComplaintStatus): CitizenComplaintStatus {
  const normalized = stringFrom(value, fallback).toLowerCase().replace(/[_\s-]+/g, "");

  if (normalized === "pending") {
    return "pending";
  }

  if (normalized === "inprogress") {
    return "in_progress";
  }

  if (normalized === "resolved") {
    return "resolved";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  return fallback;
}

function normalizePriority(
  value: unknown,
  fallback: CitizenComplaint["priority"],
): CitizenComplaint["priority"] {
  const normalized = stringFrom(value, fallback).toLowerCase();

  if (normalized.includes("critical")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "high";
  }

  return "normal";
}

function normalizeComplaints(payload: unknown): CitizenComplaint[] {
  const list = unwrapArray<unknown>(payload, "complaints", []);
  return list.map(normalizeComplaint);
}

function normalizeAiAnalysis(payload: unknown): AiAnalysisResult {
  const analysis = unwrapRecord(payload);
  const duplicate = isRecord(analysis.duplicate_check ?? analysis.duplicateCheck)
    ? ((analysis.duplicate_check ?? analysis.duplicateCheck) as UnknownRecord)
    : {};

  return {
    verified: booleanFrom(analysis.verified, sampleAiAnalysis.verified),
    confidence: numberFrom(analysis.confidence, sampleAiAnalysis.confidence),
    detectedCategory: stringFrom(
      analysis.detected_category ?? analysis.detectedCategory,
      sampleAiAnalysis.detectedCategory,
    ) as CitizenComplaintCategory,
    severityLabel: stringFrom(
      analysis.severity_label ?? analysis.severityLabel,
      sampleAiAnalysis.severityLabel,
    ),
    sizeEstimate: stringFrom(
      analysis.size_estimate ?? analysis.sizeEstimate,
      sampleAiAnalysis.sizeEstimate ?? "",
    ),
    priority: stringFrom(analysis.priority, sampleAiAnalysis.priority) as AiAnalysisResult["priority"],
    department: stringFrom(analysis.department, sampleAiAnalysis.department),
    etaDays: numberFrom(analysis.eta_days ?? analysis.etaDays, sampleAiAnalysis.etaDays),
    summary: stringFrom(analysis.summary, ""),
    keywords: Array.isArray(analysis.keywords) ? analysis.keywords.map(String) : [],
    duplicateCheck: {
      isDuplicate: booleanFrom(
        duplicate.is_duplicate ?? duplicate.isDuplicate,
        sampleAiAnalysis.duplicateCheck.isDuplicate,
      ),
      complaintId: stringFrom(
        duplicate.complaint_id ??
          duplicate.complaintId ??
          analysis.duplicate_complaint_id,
        "",
      ),
      complaintNo: stringFrom(
        duplicate.complaint_no ?? duplicate.complaintNo,
        sampleAiAnalysis.duplicateCheck.complaintNo ?? "",
      ),
      title: stringFrom(duplicate.title, sampleAiAnalysis.duplicateCheck.title ?? ""),
      distanceMeters: numberFrom(
        duplicate.distance_meters ?? duplicate.distanceMeters,
        sampleAiAnalysis.duplicateCheck.distanceMeters ?? 0,
      ),
      similarityScore: numberFrom(
        duplicate.similarity_score ?? duplicate.probability ?? analysis.similarity_score,
        0,
      ),
    },
  };
}

export async function fetchCitizenProfile(): Promise<CitizenServiceResult<CitizenProfile>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/users/me`);
    return normalizeProfile(response.data);
  }, sampleProfile);
}

export async function fetchCitizenStats(): Promise<CitizenServiceResult<CitizenStats>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/users/me/stats`);
    return normalizeStats(response.data);
  }, sampleStats);
}

export async function fetchCitizenBadges(): Promise<CitizenServiceResult<CitizenBadge[]>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/users/me/badges`);
    return unwrapArray<CitizenBadge>(response.data, "badges", sampleBadges);
  }, sampleBadges);
}

export async function fetchNotifications(): Promise<CitizenServiceResult<CitizenNotification[]>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/notifications`);
    return unwrapArray<CitizenNotification>(response.data, "notifications", sampleNotifications);
  }, sampleNotifications);
}

export async function fetchNearbyComplaints(
  lat: number,
  lng: number,
  radiusKm = 2,
): Promise<CitizenServiceResult<CitizenComplaint[]>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/complaints/nearby`, {
      params: {
        lat,
        lng,
        radius_km: radiusKm,
      },
    });
    return normalizeComplaints(response.data);
  }, []);
}

export async function fetchWardComplaintCount(
  wardId: string,
): Promise<CitizenServiceResult<number>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/complaints`, {
      params: {
        ward_id: wardId,
        limit: 1,
      },
    });
    const payload = unwrapRecord(response.data);
    return numberFrom(payload.total, sampleStats.wardTotal);
  }, sampleStats.wardTotal);
}

export async function fetchMyComplaints(options: {
  status?: CitizenComplaintStatus | "all";
  page?: number;
  limit?: number;
}): Promise<CitizenServiceResult<CitizenComplaint[]>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/complaints/mine`, {
      params: {
        status: options.status && options.status !== "all" ? options.status : undefined,
        page: options.page ?? 1,
        limit: options.limit ?? 10,
      },
    });
    return normalizeComplaints(response.data);
  }, []);
}

export async function fetchPublicComplaints(options: {
  wardId?: string;
  category?: CitizenComplaintCategory | "all";
  status?: CitizenComplaintStatus | "all";
  priority?: "all" | "high";
  sort?: "newest" | "upvotes" | "nearby";
  page?: number;
  limit?: number;
}): Promise<CitizenServiceResult<CitizenComplaint[]>> {
  return withSampleFallback(async () => {
    const response = await apiClient.get(`${API_PREFIX}/complaints`, {
      params: {
        ward_id: options.wardId,
        category: options.category && options.category !== "all" ? options.category : undefined,
        status: options.status && options.status !== "all" ? options.status : undefined,
        priority: options.priority === "high" ? "high" : undefined,
        page: options.page ?? 1,
        limit: options.limit ?? 12,
        sort: options.sort ?? "newest",
      },
    });
    return normalizeComplaints(response.data);
  }, []);
}

export async function fetchComplaintById(id: string): Promise<ComplaintDetailPayload> {
  const response = await apiClient.get(`${API_PREFIX}/complaints/${id}`);
  const complaint = normalizeComplaint(unwrapRecord(response.data).complaint ?? response.data, 0);
  const [timeline, comments] = await Promise.all([
    fetchComplaintTimeline(id),
    fetchComplaintComments(id),
  ]);

  return {
    complaint,
    timeline,
    comments,
  };
}

export async function fetchComplaintTimeline(id: string): Promise<ComplaintTimelineItem[]> {
  const response = await apiClient.get(`${API_PREFIX}/complaints/${id}/timeline`);
  const items = unwrapArray<unknown>(response.data, "timeline", []);

  return items.map(normalizeTimelineItem);
}

export async function fetchComplaintComments(id: string): Promise<ComplaintComment[]> {
  const response = await apiClient.get(`${API_PREFIX}/complaints/${id}/comments`);
  const items = unwrapArray<unknown>(response.data, "comments", []);

  return items.map(normalizeComment);
}

export async function upvoteComplaintApi(id: string): Promise<void> {
  await apiClient.post(`${API_PREFIX}/complaints/${id}/upvote`);
}

export async function followComplaintApi(id: string): Promise<void> {
  await apiClient.post(`${API_PREFIX}/complaints/${id}/follow`);
}

export async function unfollowComplaintApi(id: string): Promise<void> {
  await apiClient.delete(`${API_PREFIX}/complaints/${id}/follow`);
}

export async function analyzeReportDraft(
  payload: CreateReportPayload,
): Promise<CitizenServiceResult<AiAnalysisResult>> {
  return withSampleFallback(async () => {
    const response = await apiClient.post(`${API_PREFIX}/complaints/analyze`, {
      category: payload.category,
      title: payload.title,
      description: payload.description,
      lat: payload.lat,
      lng: payload.lng,
      photo_count: payload.photos.length,
    });
    return normalizeAiAnalysis(response.data);
  }, {
    ...sampleAiAnalysis,
    detectedCategory: payload.category,
    duplicateCheck: {
      ...sampleAiAnalysis.duplicateCheck,
      isDuplicate: payload.title.toLowerCase().includes("pothole"),
    },
  });
}

export async function submitCitizenComplaint(
  payload: CreateReportPayload,
): Promise<CitizenServiceResult<CitizenComplaint>> {
  const formData = new FormData();
  formData.append("category", payload.category);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("lat", String(payload.lat));
  formData.append("lng", String(payload.lng));
  formData.append("address", payload.address);
  formData.append("area", payload.area);
  formData.append("ward", payload.ward);
  formData.append("wardId", payload.wardId);
  formData.append("city", payload.city);
  if (payload.wardNumber) {
    formData.append("wardNumber", payload.wardNumber);
  }
  if (payload.municipality) {
    formData.append("municipality", payload.municipality);
  }
  if (payload.province) {
    formData.append("province", payload.province);
  }
  if (payload.continueAsNew) {
    formData.append("continue_as_new", "true");
  }

  payload.photos.forEach((photo) => {
    formData.append("photos[]", {
      uri: photo.uri,
      name: photo.name ?? "complaint-photo.jpg",
      type: photo.type ?? "image/jpeg",
    } as unknown as Blob);
  });

  const response = await apiClient.post(`${API_PREFIX}/complaints`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return {
    data: normalizeComplaint(unwrapRecord(response.data).complaint ?? response.data, 0),
    source: "api",
  };
}

export async function upvoteComplaint(id: string): Promise<CitizenServiceResult<{ id: string }>> {
  return withSampleFallback(async () => {
    await apiClient.post(`${API_PREFIX}/complaints/${id}/upvote`);
    return { id };
  }, { id });
}

export async function followComplaint(
  id: string,
  shouldFollow: boolean,
): Promise<CitizenServiceResult<{ id: string; followed: boolean }>> {
  return withSampleFallback(async () => {
    if (shouldFollow) {
      await apiClient.post(`${API_PREFIX}/complaints/${id}/follow`);
    } else {
      await apiClient.delete(`${API_PREFIX}/complaints/${id}/follow`);
    }

    return { id, followed: shouldFollow };
  }, { id, followed: shouldFollow });
}

export async function updatePublicProfile(
  isPublic: boolean,
): Promise<CitizenServiceResult<{ isPublic: boolean }>> {
  return withSampleFallback(async () => {
    await apiClient.patch(`${API_PREFIX}/users/me`, {
      is_public: isPublic,
    });
    return { isPublic };
  }, { isPublic });
}
