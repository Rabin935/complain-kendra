import CommentModel from "../models/Comment";
import ComplaintModel, { type ComplaintDocument } from "../models/Complaint";
import ComplaintRatingModel from "../models/ComplaintRating";
import ComplaintTimelineModel from "../models/ComplaintTimeline";
import ComplaintUpvoteModel from "../models/ComplaintUpvote";
import FollowModel from "../models/Follow";
import UserModel from "../models/User";
import {
  type ComplaintCategory,
  type ComplaintFilterDto,
  type ComplaintAiMetadata,
  type ComplaintLocation,
  type ComplaintPayload,
  type ComplaintPriority,
  type ComplaintStatus,
  type CreateComplaintDto,
  type JwtUserPayload,
  type UpdateComplaintDto,
} from "../types";
import { AppError } from "../utils/appError";
import {
  escapeRegex,
  getNumber,
  getString,
  isRecord,
  normalizeCategory,
  normalizeStatus,
  parsePagination,
  requireObjectId,
  requireString,
} from "../utils/request.utils";
import { saveUploadedImage } from "../utils/upload.utils";
import { analyzeComplaint } from "./ai.service";
import { getDepartmentForCategory } from "./department-routing.service";
import { createNotification } from "./notification.service";
import { awardPoints } from "./points.service";
import { emitRealtimeEvent } from "../sockets/realtime";
import { buildWardLocation, resolveWardFromPayload } from "./ward.service";
import { calculateComplaintPriority } from "./priority-engine.service";
import { detectDuplicateComplaint } from "./duplicate-detection.service";

type UploadedComplaintPhoto = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

const statusProgress: Record<ComplaintStatus, number> = {
  pending: 18,
  accepted: 35,
  in_progress: 58,
  resolved: 100,
  rejected: 100,
};

function mapComplaintLocation(location: ComplaintDocument["location"]): ComplaintLocation | undefined {
  if (!location) {
    return undefined;
  }

  const mapped: ComplaintLocation = {};

  for (const key of [
    "lat",
    "lng",
    "address",
    "area",
    "ward",
    "wardId",
    "wardName",
    "wardNumber",
    "city",
    "municipality",
    "province",
  ] as const) {
    const value = location[key];

    if (value !== undefined && value !== null && value !== "") {
      (mapped as Record<string, unknown>)[key] = value;
    }
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function getComplaintOwnerId(complaint: ComplaintDocument): string {
  return typeof complaint.userId === "string"
    ? complaint.userId
    : complaint.userId.toString();
}

function buildAiMetadata(input: {
  duplicateCount: number;
  priorityResult: ReturnType<typeof calculateComplaintPriority>;
  routedDepartment: string;
  source: ComplaintAiMetadata["source"];
}): ComplaintAiMetadata {
  const hasGeminiKey = Boolean(
    process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  );
  const usesMockProvider = process.env.AI_PROVIDER?.toLowerCase() === "mock" || !hasGeminiKey;

  return {
    provider: usesMockProvider ? "mock" : "gemini",
    model: usesMockProvider ? undefined : process.env.GEMINI_MODEL || "gemini-1.5-flash",
    source: input.source,
    completedAt: new Date(),
    routedDepartment: input.routedDepartment,
    duplicateCount: input.duplicateCount,
    priority: input.priorityResult.priority,
    priorityScore: input.priorityResult.score,
    priorityReasons: input.priorityResult.reasons,
  };
}

export function toComplaintPayload(
  complaint: ComplaintDocument,
  extras: { followed?: boolean; distanceKm?: number } = {},
): ComplaintPayload {
  const assignedOfficerId = complaint.assignedOfficerId
    ? complaint.assignedOfficerId.toString()
    : undefined;

  return {
    id: complaint._id.toString(),
    userId: getComplaintOwnerId(complaint),
    complaintNo: complaint.complaintNo,
    title: complaint.title,
    description: complaint.description,
    location: mapComplaintLocation(complaint.location),
    photo: complaint.photo,
    photos: complaint.photos ?? [],
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    calculatedPriority: complaint.calculatedPriority,
    priorityScore: complaint.priorityScore,
    priorityReasons: complaint.priorityReasons ?? [],
    priorityOverriddenBy: complaint.priorityOverriddenBy?.toString(),
    priorityOverriddenAt: complaint.priorityOverriddenAt,
    priorityOverrideReason: complaint.priorityOverrideReason,
    duplicateOfComplaintId: complaint.duplicateOfComplaintId?.toString(),
    duplicateSimilarityScore: complaint.duplicateSimilarityScore,
    duplicateCheckedAt: complaint.duplicateCheckedAt,
    progress: statusProgress[complaint.status],
    aiAnalysis: complaint.aiAnalysis,
    aiMetadata: complaint.aiMetadata,
    ai: {
      // Complaint detail clients can read one cohesive AI block instead of stitching legacy fields.
      analysis: complaint.aiAnalysis,
      metadata: complaint.aiMetadata,
      verified: complaint.aiVerified,
      suggestedCategory: complaint.aiSuggestedCategory,
      severity: complaint.aiSeverity,
      summary: complaint.aiSummary,
      keywords: complaint.aiKeywords ?? [],
    },
    aiVerified: complaint.aiVerified,
    aiSuggestedCategory: complaint.aiSuggestedCategory,
    aiSeverity: complaint.aiSeverity,
    aiSummary: complaint.aiSummary,
    aiKeywords: complaint.aiKeywords ?? [],
    embedding: complaint.embedding ?? [],
    assignedOfficerId,
    assignedOfficerName: complaint.assignedOfficerName,
    assignedDepartment: complaint.assignedDepartment,
    departmentOverriddenBy: complaint.departmentOverriddenBy?.toString(),
    departmentOverriddenAt: complaint.departmentOverriddenAt,
    departmentOverrideReason: complaint.departmentOverrideReason,
    rejectionReason: complaint.rejectionReason,
    resolutionNote: complaint.resolutionNote,
    upvotes: complaint.upvoteCount,
    comments: complaint.commentCount,
    followers: complaint.followerCount,
    followed: extras.followed,
    distanceKm: extras.distanceKm,
    etaDays: complaint.aiAnalysis?.etaDays,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

async function normalizeLocation(payload: Record<string, unknown>): Promise<ComplaintLocation | undefined> {
  const rawLocation = isRecord(payload.location) ? payload.location : payload;
  const location: ComplaintLocation = {};
  const lat = getNumber(rawLocation.lat ?? rawLocation.latitude);
  const lng = getNumber(rawLocation.lng ?? rawLocation.longitude);

  if (lat !== undefined) {
    location.lat = lat;
  }

  if (lng !== undefined) {
    location.lng = lng;
  }

  const address = getString(rawLocation.address);
  const area = getString(rawLocation.area);
  const city = getString(rawLocation.city);
  const municipality = getString(rawLocation.municipality);
  const province = getString(rawLocation.province);

  if (address) {
    location.address = address;
  }

  if (area) {
    location.area = area;
  }

  if (city) {
    location.city = city;
  }

  if (municipality) {
    location.municipality = municipality;
  }

  if (province) {
    location.province = province;
  }

  const selectedWard = await resolveWardFromPayload(payload, { fallbackCity: city });

  if (selectedWard) {
    return buildWardLocation(selectedWard, location);
  }

  return Object.keys(location).length > 0 ? location : undefined;
}

async function generateComplaintNo(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await ComplaintModel.countDocuments({
    complaintNo: new RegExp(`^CK-${year}-`),
  });
  let next = count + 1;

  while (next < count + 100) {
    const complaintNo = `CK-${year}-${String(next).padStart(4, "0")}`;
    const exists = await ComplaintModel.exists({ complaintNo });

    if (!exists) {
      return complaintNo;
    }

    next += 1;
  }

  return `CK-${year}-${Date.now().toString().slice(-4)}`;
}

async function normalizeCreateComplaintInput(payload: CreateComplaintDto | Record<string, unknown>) {
  const record = isRecord(payload) ? payload : {};
  const category = normalizeCategory(record.category, true) as ComplaintCategory;
  const photos = Array.isArray(record.photos)
    ? record.photos.map(String).filter(Boolean)
    : getString(record.photo)
      ? [getString(record.photo) as string]
      : [];

  return {
    title: requireString(record.title, "Title"),
    description: requireString(record.description, "Description"),
    category,
    status: normalizeStatus(record.status) ?? "pending",
    location: await normalizeLocation(record),
    photos,
    photo: photos[0],
  };
}

function getBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return false;
}

async function normalizeUpdateComplaintInput(payload: UpdateComplaintDto | Record<string, unknown>) {
  const record = isRecord(payload) ? payload : {};
  const updates: Record<string, unknown> = {};

  if (record.title !== undefined) {
    updates.title = requireString(record.title, "Title");
  }

  if (record.description !== undefined) {
    updates.description = requireString(record.description, "Description");
  }

  if (record.category !== undefined) {
    updates.category = normalizeCategory(record.category, true);
  }

  if (record.status !== undefined) {
    updates.status = normalizeStatus(record.status, true);
  }

  // Citizens cannot manually set priority; the priority engine or officer override owns it.

  if (record.location !== undefined || record.lat !== undefined || record.lng !== undefined) {
    updates.location = await normalizeLocation(record);
  }

  if (record.photo !== undefined) {
    updates.photo = getString(record.photo);
  }

  if (record.photos !== undefined && Array.isArray(record.photos)) {
    updates.photos = record.photos.map(String).filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one complaint field is required to update.", 400);
  }

  return updates;
}

function assertCitizenCanModify(complaint: ComplaintDocument, actor: JwtUserPayload): void {
  if (actor.role === "admin") {
    return;
  }

  if (actor.type !== "citizen" || getComplaintOwnerId(complaint) !== actor.subjectId) {
    throw new AppError("You are not allowed to modify this complaint.", 403);
  }
}

export async function addTimeline(input: {
  complaintId: string;
  type:
    | "submitted"
    | "ai_verified"
    | "status_changed"
    | "assigned"
    | "accepted"
    | "work_started"
    | "department_changed"
    | "priority_changed"
    | "comment_added"
    | "note_added"
    | "resolved"
    | "rejected"
    | "reopened"
    | "rated";
  title: string;
  message?: string;
  actorType?: "system" | "citizen" | "officer";
  actorId?: string;
  actorName?: string;
  isInternal?: boolean;
  metadata?: Record<string, unknown>;
}) {
  return ComplaintTimelineModel.create({
    complaintId: input.complaintId,
    type: input.type,
    title: input.title,
    message: input.message,
    actorType: input.actorType ?? "system",
    actorId: input.actorId,
    actorName: input.actorName,
    isInternal: input.isInternal ?? false,
    metadata: input.metadata,
  });
}

async function runComplaintAiAnalysis(complaintId: string): Promise<void> {
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    return;
  }

  const analysis = await analyzeComplaint({
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    lat: complaint.location?.lat,
    lng: complaint.location?.lng,
    photoCount: complaint.photos.length,
    photoUrl: complaint.photos[0],
  });

  // Store the AI result directly on the complaint so reads do not need a second query.
  complaint.aiAnalysis = analysis;
  complaint.aiVerified = analysis.verified;
  complaint.aiSuggestedCategory = analysis.detectedCategory;
  const aiSeverity =
    analysis.severityLabel === "critical"
      ? 10
      : analysis.severityLabel === "high"
        ? 8
        : analysis.severityLabel === "medium"
          ? 5
          : 2;
  complaint.aiSeverity = aiSeverity;
  complaint.aiSummary = analysis.summary;
  complaint.aiKeywords = analysis.keywords;
  const duplicateCount = await countSimilarOpenComplaints({
    category: analysis.detectedCategory,
    description: complaint.description,
    wardId: complaint.location?.wardId,
    excludeComplaintId: complaintId,
  });
  const priorityResult = calculateComplaintPriority({
    category: analysis.detectedCategory,
    description: complaint.description,
    duplicateCount,
    aiSeverity,
  });
  complaint.calculatedPriority = priorityResult.priority;
  complaint.priorityScore = priorityResult.score;
  complaint.priorityReasons = priorityResult.reasons;
  if (!complaint.priorityOverriddenAt) {
    // Automatic priority updates stop once an officer manually overrides the complaint.
    complaint.priority = priorityResult.priority;
  }
  // If an officer has not overridden the route, keep the department aligned with AI category detection.
  if (!complaint.departmentOverriddenAt) {
    complaint.assignedDepartment = getDepartmentForCategory(analysis.detectedCategory);
  }
  const aiMetadata = buildAiMetadata({
    duplicateCount,
    priorityResult,
    routedDepartment: complaint.assignedDepartment ?? analysis.department,
    source: "background_queue",
  });
  complaint.aiMetadata = aiMetadata;
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "ai_verified",
    title: "AI analysis completed",
    message: `${analysis.department} routed with ${complaint.priority} priority.`,
    metadata: { analysis, aiMetadata, priorityResult, duplicateCount },
  });

  if (analysis.verified) {
    await awardPoints({
      userId: getComplaintOwnerId(complaint),
      complaintId,
      type: "submit_verified_complaint",
      reason: "Submit verified complaint",
    });
  }

  await createNotification({
    userId: getComplaintOwnerId(complaint),
    type: "ai_analysis_completed",
    title: "AI analysis completed",
    body: `Your complaint ${complaint.complaintNo} was routed to ${analysis.department}.`,
    data: { complaintId, complaintNo: complaint.complaintNo, aiMetadata },
  });

  if (complaint.assignedOfficerId) {
    await createNotification({
      userId: complaint.assignedOfficerId.toString(),
      recipientType: "officer",
      type: "ai_analysis_completed",
      title: "AI analysis completed",
      body: `${complaint.complaintNo} was routed to ${aiMetadata.routedDepartment} with ${complaint.priority} priority.`,
      data: {
        complaintId,
        complaintNo: complaint.complaintNo,
        citizenId: getComplaintOwnerId(complaint),
        aiMetadata,
      },
    });
  }

  emitRealtimeEvent("complaint:ai_complete", {
    complaintId,
    userId: getComplaintOwnerId(complaint),
    officerId: complaint.assignedOfficerId?.toString(),
    complaintNo: complaint.complaintNo,
    aiMetadata,
  });
}

export function queueComplaintAnalysis(complaintId: string): void {
  // Run after the response cycle starts so creating a complaint is not blocked by AI work.
  setTimeout(() => {
    void runComplaintAiAnalysis(complaintId).catch((error) => {
      console.error("Complaint AI analysis job failed:", error);
    });
  }, 0);
}

export async function createComplaint(
  userId: string,
  payload: CreateComplaintDto | Record<string, unknown>,
): Promise<ComplaintPayload> {
  const normalizedUserId = requireObjectId(userId, "user id");
  const user = await UserModel.findById(normalizedUserId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.isBanned) {
    throw new AppError(user.banReason || "This account is banned.", 403);
  }

  const normalizedPayload = await normalizeCreateComplaintInput(payload);
  const assignedDepartment = getDepartmentForCategory(normalizedPayload.category);
  const continueAsNew = getBoolean(
    (payload as Record<string, unknown>).continue_as_new ??
      (payload as Record<string, unknown>).continueAsNew,
  );
  const duplicateResult = await detectDuplicateComplaint({
    category: normalizedPayload.category,
    description: normalizedPayload.description,
    lat: normalizedPayload.location?.lat,
    lng: normalizedPayload.location?.lng,
    wardId: normalizedPayload.location?.wardId,
  });

  if (duplicateResult.duplicate_found && !continueAsNew) {
    throw new AppError("Similar complaint already exists.", 409, {
      duplicate: duplicateResult,
      duplicate_found: duplicateResult.duplicate_found,
      duplicate_complaint_id: duplicateResult.duplicate_complaint_id,
      similarity_score: duplicateResult.similarity_score,
      action_required: "follow_existing_or_continue",
    });
  }

  const duplicateCount = await countSimilarOpenComplaints({
    category: normalizedPayload.category,
    description: normalizedPayload.description,
    wardId: normalizedPayload.location?.wardId,
  });
  const priorityResult = calculateComplaintPriority({
    category: normalizedPayload.category,
    description: normalizedPayload.description,
    duplicateCount,
  });
  const complaint = await ComplaintModel.create({
    ...normalizedPayload,
    // Store the first calculated priority before AI analysis refines it.
    priority: priorityResult.priority,
    calculatedPriority: priorityResult.priority,
    priorityScore: priorityResult.score,
    priorityReasons: priorityResult.reasons,
    // If the user continues anyway, keep a link to the matched complaint for review.
    duplicateOfComplaintId:
      duplicateResult.duplicate_found && duplicateResult.duplicate_complaint_id
        ? duplicateResult.duplicate_complaint_id
        : undefined,
    duplicateSimilarityScore: duplicateResult.similarity_score,
    duplicateCheckedAt: new Date(),
    // Automatically route a new complaint from its selected category.
    assignedDepartment,
    complaintNo: await generateComplaintNo(),
    userId: normalizedUserId,
  });

  await addTimeline({
    complaintId: complaint._id.toString(),
    type: "submitted",
    title: "Complaint submitted",
    message: `Citizen complaint received and routed to ${assignedDepartment}.`,
    actorType: "citizen",
    actorId: normalizedUserId,
    actorName: user.name,
  });

  await createNotification({
    userId: normalizedUserId,
    type: "complaint_submitted",
    title: "Complaint submitted",
    body: `${complaint.complaintNo} has been submitted.`,
    data: { complaintId: complaint._id.toString(), complaintNo: complaint.complaintNo },
  });

  emitRealtimeEvent("complaint:created", {
    complaintId: complaint._id.toString(),
    userId: normalizedUserId,
    complaintNo: complaint.complaintNo,
  });
  emitRealtimeEvent("officer:queue_updated", {
    complaintId: complaint._id.toString(),
    ward: complaint.location?.ward,
  });
  // Automatically starts mock AI analysis for every new complaint.
  queueComplaintAnalysis(complaint._id.toString());

  return toComplaintPayload(complaint);
}

async function countSimilarOpenComplaints(input: {
  category: ComplaintCategory;
  description: string;
  wardId?: string;
  excludeComplaintId?: string;
}): Promise<number> {
  const words = input.description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 6);
  const query: Record<string, unknown> = {
    category: input.category,
    status: { $nin: ["resolved", "rejected"] },
  };

  if (input.wardId) {
    query["location.wardId"] = input.wardId;
  }

  if (input.excludeComplaintId) {
    query._id = { $ne: input.excludeComplaintId };
  }

  if (words.length > 0) {
    query.$text = { $search: words.join(" ") };
  }

  // Duplicate count gives the priority engine a crowd-signal without needing a real duplicate model.
  return ComplaintModel.countDocuments(query);
}

export async function uploadComplaintPhoto(file: UploadedComplaintPhoto): Promise<string> {
  if (file.size <= 0) {
    throw new AppError("Photo file is required.", 400);
  }

  return saveUploadedImage({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder: "complaints",
  });
}

export async function uploadComplaintPhotos(files: UploadedComplaintPhoto[]): Promise<string[]> {
  if (files.length > 4) {
    throw new AppError("A complaint can include up to 4 photos.", 400);
  }

  const uploads: string[] = [];

  for (const file of files) {
    uploads.push(await uploadComplaintPhoto(file));
  }

  return uploads;
}

function buildComplaintQuery(filter: ComplaintFilterDto = {}): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filter.search) {
    const search = escapeRegex(filter.search);
    query.$or = [
      { title: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  if (filter.ward) {
    const ward = filter.ward.replace(/^Ward\s+/i, "");
    query["location.ward"] = new RegExp(`^(Ward\\s*)?${escapeRegex(ward)}$`, "i");
  }

  if (filter.wardId) {
    query["location.wardId"] = filter.wardId;
  }

  if (filter.city) {
    query["location.city"] = new RegExp(`^${escapeRegex(filter.city)}$`, "i");
  }

  if (filter.city) {
    query["location.city"] = new RegExp(`^${escapeRegex(filter.city)}$`, "i");
  }

  if (filter.category) {
    query.category = filter.category;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.priority === "high") {
    query.priority = { $in: ["high", "critical"] };
  } else if (filter.priority) {
    query.priority = filter.priority;
  }

  return query;
}

export async function getAllComplaints(
  filter: ComplaintFilterDto = {},
  actor?: JwtUserPayload,
): Promise<{ complaints: ComplaintPayload[]; total: number; page: number; limit: number }> {
  const pagination = parsePagination(filter as Record<string, unknown>);
  const query = buildComplaintQuery(filter);
  const sort: Record<string, 1 | -1> =
    filter.sort === "oldest"
      ? { createdAt: 1 }
      : filter.sort === "upvotes" || filter.sort === "most_upvoted"
        ? { upvoteCount: -1, createdAt: -1 }
        : { createdAt: -1 };
  const shouldSortNearest =
    (filter.sort === "nearby" || filter.sort === "nearest") &&
    typeof filter.lat === "number" &&
    typeof filter.lng === "number";
  const [allComplaints, total] = await Promise.all([
    shouldSortNearest
      ? ComplaintModel.find(query).sort({ createdAt: -1 })
      : ComplaintModel.find(query).sort(sort).skip(pagination.skip).limit(pagination.limit),
    ComplaintModel.countDocuments(query),
  ]);
  const complaints = shouldSortNearest
    ? allComplaints
        .map((complaint) => {
          const lat = complaint.location?.lat;
          const lng = complaint.location?.lng;
          const distanceKm =
            typeof lat === "number" && typeof lng === "number"
              ? getDistanceKm({ lat: filter.lat as number, lng: filter.lng as number }, { lat, lng })
              : Number.POSITIVE_INFINITY;

          return { complaint, distanceKm };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(pagination.skip, pagination.skip + pagination.limit)
        .map((item) => item.complaint)
    : allComplaints;

  const followedIds = actor?.type === "citizen"
    ? new Set(
        (
          await FollowModel.find({
            userId: actor.subjectId,
            complaintId: { $in: complaints.map((complaint) => complaint._id.toString()) },
          })
        ).map((follow) => follow.complaintId.toString()),
      )
    : new Set<string>();

  return {
    complaints: complaints.map((complaint) =>
      toComplaintPayload(complaint, {
        followed: followedIds.has(complaint._id.toString()),
        distanceKm: shouldSortNearest
          ? Number(
              getDistanceKm(
                { lat: filter.lat as number, lng: filter.lng as number },
                {
                  lat: complaint.location?.lat ?? filter.lat as number,
                  lng: complaint.location?.lng ?? filter.lng as number,
                },
              ).toFixed(2),
            )
          : undefined,
      }),
    ),
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

export async function getMyComplaints(
  userId: string,
  filter: ComplaintFilterDto = {},
): Promise<{ complaints: ComplaintPayload[]; total: number; page: number; limit: number }> {
  const normalizedUserId = requireObjectId(userId, "user id");
  const pagination = parsePagination(filter as Record<string, unknown>);
  const query = {
    ...buildComplaintQuery(filter),
    userId: normalizedUserId,
  };
  const [complaints, total] = await Promise.all([
    ComplaintModel.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    ComplaintModel.countDocuments(query),
  ]);

  return {
    complaints: complaints.map((complaint) => toComplaintPayload(complaint)),
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

function getDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function getNearbyComplaints(input: {
  lat: number;
  lng: number;
  radiusKm?: number;
  actor?: JwtUserPayload;
}) {
  const radiusKm = input.radiusKm ?? 2;
  const complaints = await ComplaintModel.find({
    "location.lat": { $exists: true },
    "location.lng": { $exists: true },
  }).sort({ createdAt: -1 });

  const nearby = complaints
    .map((complaint) => {
      const lat = complaint.location?.lat;
      const lng = complaint.location?.lng;
      const distanceKm =
        typeof lat === "number" && typeof lng === "number"
          ? getDistanceKm({ lat: input.lat, lng: input.lng }, { lat, lng })
          : Number.POSITIVE_INFINITY;

      return { complaint, distanceKm };
    })
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return nearby.map((item) =>
    toComplaintPayload(item.complaint, {
      distanceKm: Number(item.distanceKm.toFixed(2)),
    }),
  );
}

export async function getComplaintById(
  id: string,
  actor?: JwtUserPayload,
): Promise<ComplaintPayload> {
  const normalizedComplaintId = requireObjectId(id, "complaint id");
  const complaint = await ComplaintModel.findById(normalizedComplaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  let followed = false;

  if (actor?.type === "citizen") {
    followed = Boolean(
      await FollowModel.exists({
        complaintId: normalizedComplaintId,
        userId: actor.subjectId,
      }),
    );
  }

  return toComplaintPayload(complaint, { followed });
}

export async function getComplaintDetail(
  id: string,
  actor?: JwtUserPayload,
) {
  const normalizedComplaintId = requireObjectId(id, "complaint id");
  const [complaint, timeline, comments] = await Promise.all([
    getComplaintById(normalizedComplaintId, actor),
    getComplaintTimeline(normalizedComplaintId, actor?.type === "officer"),
    CommentModel.find({
      complaintId: normalizedComplaintId,
      deletedAt: undefined,
    })
      .sort({ createdAt: 1 })
      .limit(100),
  ]);

  return {
    complaint,
    timeline,
    comments,
  };
}

export async function getComplaintTimeline(id: string, includeInternal = false) {
  const complaintId = requireObjectId(id, "complaint id");
  const query: Record<string, unknown> = { complaintId };

  if (!includeInternal) {
    query.isInternal = false;
  }

  return ComplaintTimelineModel.find(query).sort({ createdAt: 1 });
}

export async function updateComplaint(
  id: string,
  payload: UpdateComplaintDto | Record<string, unknown>,
  actor: JwtUserPayload,
): Promise<ComplaintPayload> {
  const normalizedComplaintId = requireObjectId(id, "complaint id");
  const complaint = await ComplaintModel.findById(normalizedComplaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  assertCitizenCanModify(complaint, actor);

  const updates = await normalizeUpdateComplaintInput(payload);
  if (updates.category && !complaint.departmentOverriddenAt) {
    // Keep automatic department routing synced when the complaint category changes.
    updates.assignedDepartment = getDepartmentForCategory(updates.category as ComplaintCategory);
  }
  if ((updates.category || updates.description) && !complaint.priorityOverriddenAt) {
    const nextCategory = (updates.category as ComplaintCategory | undefined) ?? complaint.category;
    const nextDescription = (updates.description as string | undefined) ?? complaint.description;
    const duplicateCount = await countSimilarOpenComplaints({
      category: nextCategory,
      description: nextDescription,
      wardId: complaint.location?.wardId,
      excludeComplaintId: normalizedComplaintId,
    });
    const priorityResult = calculateComplaintPriority({
      category: nextCategory,
      description: nextDescription,
      duplicateCount,
      aiSeverity: complaint.aiSeverity,
    });

    // Recalculate priority after meaningful complaint edits unless an officer overrode it.
    updates.priority = priorityResult.priority;
    updates.calculatedPriority = priorityResult.priority;
    updates.priorityScore = priorityResult.score;
    updates.priorityReasons = priorityResult.reasons;
  }
  const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
    normalizedComplaintId,
    updates,
    { new: true, runValidators: true },
  );

  if (!updatedComplaint) {
    throw new AppError("Complaint could not be updated.", 500);
  }

  return toComplaintPayload(updatedComplaint);
}

export async function deleteComplaint(id: string, actor: JwtUserPayload): Promise<void> {
  const normalizedComplaintId = requireObjectId(id, "complaint id");
  const complaint = await ComplaintModel.findById(normalizedComplaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  assertCitizenCanModify(complaint, actor);
  await ComplaintModel.deleteOne({ _id: normalizedComplaintId });
}

export async function upvoteComplaint(id: string, userId: string) {
  const complaintId = requireObjectId(id, "complaint id");
  const normalizedUserId = requireObjectId(userId, "user id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  const created = await ComplaintUpvoteModel.updateOne(
    { complaintId, userId: normalizedUserId },
    { $setOnInsert: { complaintId, userId: normalizedUserId } },
    { upsert: true },
  );

  if (created.upsertedCount > 0) {
    complaint.upvoteCount += 1;
    await complaint.save();

    if (getComplaintOwnerId(complaint) !== normalizedUserId) {
      await awardPoints({
        userId: getComplaintOwnerId(complaint),
        complaintId,
        type: "receive_upvote",
        reason: "Receive complaint upvote",
      });
      await createNotification({
        userId: getComplaintOwnerId(complaint),
        type: "complaint_upvoted",
        title: "Complaint upvoted",
        body: `${complaint.complaintNo} received an upvote.`,
        data: { complaintId, complaintNo: complaint.complaintNo },
      });
    }
  }

  emitRealtimeEvent("complaint:upvoted", {
    complaintId,
    upvotes: complaint.upvoteCount,
  });

  return toComplaintPayload(complaint);
}

export async function followComplaint(id: string, userId: string) {
  const complaintId = requireObjectId(id, "complaint id");
  const normalizedUserId = requireObjectId(userId, "user id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  const created = await FollowModel.updateOne(
    { complaintId, userId: normalizedUserId },
    { $setOnInsert: { complaintId, userId: normalizedUserId } },
    { upsert: true },
  );

  if (created.upsertedCount > 0) {
    complaint.followerCount += 1;
    await complaint.save();

    if (getComplaintOwnerId(complaint) !== normalizedUserId) {
      await createNotification({
        userId: getComplaintOwnerId(complaint),
        type: "complaint_followed",
        title: "Complaint followed",
        body: `${complaint.complaintNo} has a new follower.`,
        data: { complaintId, complaintNo: complaint.complaintNo },
      });
    }
  }

  return toComplaintPayload(complaint, { followed: true });
}

export async function unfollowComplaint(id: string, userId: string) {
  const complaintId = requireObjectId(id, "complaint id");
  const normalizedUserId = requireObjectId(userId, "user id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  const deleted = await FollowModel.deleteOne({
    complaintId,
    userId: normalizedUserId,
  });

  if (deleted.deletedCount > 0) {
    complaint.followerCount = Math.max(0, complaint.followerCount - 1);
    await complaint.save();
  }

  return toComplaintPayload(complaint, { followed: false });
}

export async function rateComplaint(input: {
  complaintId: string;
  userId: string;
  rating: number;
  comment?: string;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const userId = requireObjectId(input.userId, "user id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  if (complaint.status !== "resolved") {
    throw new AppError("Only resolved complaints can be rated.", 400);
  }

  if (getComplaintOwnerId(complaint) !== userId) {
    throw new AppError("Only the complaint owner can rate the resolution.", 403);
  }

  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  await ComplaintRatingModel.findOneAndUpdate(
    { complaintId, userId },
    {
      $set: {
        complaintId,
        userId,
        rating,
        comment: input.comment,
      },
    },
    { upsert: true, new: true },
  );

  const ratings = await ComplaintRatingModel.find({ complaintId });
  complaint.ratingAverage =
    ratings.reduce((sum, item) => sum + item.rating, 0) / Math.max(ratings.length, 1);
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "rated",
    title: "Resolution rated",
    message: `Citizen rated the resolution ${rating}/5.`,
    actorType: "citizen",
    actorId: userId,
  });

  await awardPoints({
    userId,
    complaintId,
    type: "rate_resolved_complaint",
    reason: "Rate resolved complaint",
  });

  return ComplaintRatingModel.findOne({ complaintId, userId });
}

export async function getComplaintRating(complaintId: string, userId: string) {
  return ComplaintRatingModel.findOne({
    complaintId: requireObjectId(complaintId, "complaint id"),
    userId: requireObjectId(userId, "user id"),
  });
}

export async function incrementCommentCount(complaintId: string): Promise<void> {
  await ComplaintModel.updateOne({ _id: complaintId }, { $inc: { commentCount: 1 } });
}

export async function decrementCommentCount(complaintId: string): Promise<void> {
  await ComplaintModel.updateOne(
    { _id: complaintId },
    { $inc: { commentCount: -1 } },
  );
}

export async function getComplaintOwner(complaintId: string) {
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  return {
    complaint,
    userId: getComplaintOwnerId(complaint),
  };
}

export async function countComplaintComments(complaintId: string): Promise<number> {
  return CommentModel.countDocuments({
    complaintId,
    deletedAt: undefined,
  });
}
