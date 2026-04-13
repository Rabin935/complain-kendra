import { isValidObjectId } from "mongoose";
import type { ComplaintDocument } from "../models/Complaint";
import {
  createComplaint as createComplaintRecord,
  deleteComplaint as deleteComplaintRecord,
  getAllComplaints as getAllComplaintRecords,
  getComplaintById as getComplaintRecordById,
  getMyComplaints as getMyComplaintRecords,
  updateComplaint as updateComplaintRecord,
} from "../repositories/complaint.repository";
import { findUserById } from "../repositories/user.repository";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type ComplaintCategory,
  type ComplaintFilterDto,
  type ComplaintLocation,
  type ComplaintPayload,
  type ComplaintStatus,
  type CreateComplaintDto,
  type JwtUserPayload,
  type UpdateComplaintDto,
} from "../types";
import { uploadToCloudinary } from "../utils/upload.utils";
import { AppError } from "../utils/appError";
import { analyzeComplaint } from "./ai.service";

type InputRecord = Record<string, unknown>;
type UploadedComplaintPhoto = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

function isPlainObject(value: unknown): value is InputRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeObjectId(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue || !isValidObjectId(normalizedValue)) {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  return normalizedValue;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return value.trim();
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a string.`, 400);
  }

  const normalizedValue = value.trim();
  return normalizedValue || undefined;
}

function normalizeOptionalNumber(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${fieldName} must be a valid number.`, 400);
  }

  return value;
}

function normalizeOptionalStringArray(
  value: unknown,
  fieldName: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError(`${fieldName} must be an array of strings.`, 400);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeOptionalNumberArray(
  value: unknown,
  fieldName: string,
): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw new AppError(`${fieldName} must be an array of numbers.`, 400);
  }

  return value;
}

function normalizeCategory(
  value: unknown,
  fieldName: string,
  required: boolean,
): ComplaintCategory | undefined {
  if (value === undefined) {
    if (required) {
      throw new AppError(`${fieldName} is required.`, 400);
    }

    return undefined;
  }

  if (
    typeof value !== "string" ||
    !COMPLAINT_CATEGORIES.includes(value as ComplaintCategory)
  ) {
    throw new AppError(
      `${fieldName} must be one of: ${COMPLAINT_CATEGORIES.join(", ")}.`,
      400,
    );
  }

  return value as ComplaintCategory;
}

function normalizeStatus(
  value: unknown,
  fieldName: string,
  required: boolean,
): ComplaintStatus | undefined {
  if (value === undefined) {
    if (required) {
      throw new AppError(`${fieldName} is required.`, 400);
    }

    return undefined;
  }

  if (
    typeof value !== "string" ||
    !COMPLAINT_STATUSES.includes(value as ComplaintStatus)
  ) {
    throw new AppError(
      `${fieldName} must be one of: ${COMPLAINT_STATUSES.join(", ")}.`,
      400,
    );
  }

  return value as ComplaintStatus;
}

function normalizeAiSeverity(value: unknown): number | undefined {
  const severity = normalizeOptionalNumber(value, "AI severity");

  if (severity === undefined) {
    return undefined;
  }

  if (severity < 1 || severity > 10) {
    throw new AppError("AI severity must be between 1 and 10.", 400);
  }

  return severity;
}

function normalizeComplaintLocation(value: unknown): ComplaintLocation | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new AppError("Location must be an object.", 400);
  }

  const location: ComplaintLocation = {};
  const latitude = normalizeOptionalNumber(value.lat, "Location latitude");
  const longitude = normalizeOptionalNumber(value.lng, "Location longitude");
  const address = normalizeOptionalText(value.address, "Location address");
  const ward = normalizeOptionalText(value.ward, "Location ward");

  if (latitude !== undefined) {
    location.lat = latitude;
  }

  if (longitude !== undefined) {
    location.lng = longitude;
  }

  if (address !== undefined) {
    location.address = address;
  }

  if (ward !== undefined) {
    location.ward = ward;
  }

  return Object.keys(location).length > 0 ? location : undefined;
}

function normalizeCreateComplaintInput(payload: CreateComplaintDto): CreateComplaintDto {
  if (!isPlainObject(payload)) {
    throw new AppError("Invalid complaint payload.", 400);
  }

  return {
    title: normalizeRequiredText(payload.title, "Title"),
    description: normalizeRequiredText(payload.description, "Description"),
    location: normalizeComplaintLocation(payload.location),
    photo: normalizeOptionalText(payload.photo, "Photo"),
    category: normalizeCategory(payload.category, "Category", true) as ComplaintCategory,
    status: normalizeStatus(payload.status, "Status", false),
    aiSuggestedCategory: normalizeOptionalText(
      payload.aiSuggestedCategory,
      "AI suggested category",
    ),
    aiSeverity: normalizeAiSeverity(payload.aiSeverity),
    aiSummary: normalizeOptionalText(payload.aiSummary, "AI summary"),
    aiKeywords: normalizeOptionalStringArray(payload.aiKeywords, "AI keywords"),
    embedding: normalizeOptionalNumberArray(payload.embedding, "Embedding"),
  };
}

function normalizeUpdateComplaintInput(
  payload: UpdateComplaintDto,
  existingComplaint: ComplaintDocument,
): UpdateComplaintDto {
  if (!isPlainObject(payload)) {
    throw new AppError("Invalid complaint update payload.", 400);
  }

  const updates: UpdateComplaintDto = {};
  const existingLocation = existingComplaint.location
    ? { ...existingComplaint.location }
    : undefined;
  const locationUpdates = normalizeComplaintLocation(payload.location);

  if (payload.title !== undefined) {
    updates.title = normalizeRequiredText(payload.title, "Title");
  }

  if (payload.description !== undefined) {
    updates.description = normalizeRequiredText(payload.description, "Description");
  }

  if (payload.location !== undefined) {
    updates.location = normalizeComplaintLocation({
      ...(existingLocation ?? {}),
      ...(locationUpdates ?? {}),
    });
  }

  if (payload.photo !== undefined) {
    updates.photo = normalizeOptionalText(payload.photo, "Photo");
  }

  if (payload.category !== undefined) {
    updates.category = normalizeCategory(payload.category, "Category", false);
  }

  if (payload.status !== undefined) {
    updates.status = normalizeStatus(payload.status, "Status", false);
  }

  if (payload.aiSuggestedCategory !== undefined) {
    updates.aiSuggestedCategory = normalizeOptionalText(
      payload.aiSuggestedCategory,
      "AI suggested category",
    );
  }

  if (payload.aiSeverity !== undefined) {
    updates.aiSeverity = normalizeAiSeverity(payload.aiSeverity);
  }

  if (payload.aiSummary !== undefined) {
    updates.aiSummary = normalizeOptionalText(payload.aiSummary, "AI summary");
  }

  if (payload.aiKeywords !== undefined) {
    updates.aiKeywords = normalizeOptionalStringArray(payload.aiKeywords, "AI keywords");
  }

  if (payload.embedding !== undefined) {
    updates.embedding = normalizeOptionalNumberArray(payload.embedding, "Embedding");
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one complaint field is required to update.", 400);
  }

  return updates;
}

function normalizeComplaintFilter(filter: ComplaintFilterDto = {}): ComplaintFilterDto {
  if (!isPlainObject(filter)) {
    throw new AppError("Invalid complaint filters.", 400);
  }

  return {
    ward: normalizeOptionalText(filter.ward, "Ward"),
    category: normalizeCategory(filter.category, "Category", false),
    status: normalizeStatus(filter.status, "Status", false),
  };
}

function getComplaintOwnerId(complaint: ComplaintDocument): string {
  return typeof complaint.userId === "string"
    ? complaint.userId
    : complaint.userId.toString();
}

function mapComplaintLocation(location: ComplaintDocument["location"]): ComplaintLocation | undefined {
  if (!location) {
    return undefined;
  }

  const complaintLocation: ComplaintLocation = {};

  if (typeof location.lat === "number") {
    complaintLocation.lat = location.lat;
  }

  if (typeof location.lng === "number") {
    complaintLocation.lng = location.lng;
  }

  if (location.address) {
    complaintLocation.address = location.address;
  }

  if (location.ward) {
    complaintLocation.ward = location.ward;
  }

  return Object.keys(complaintLocation).length > 0 ? complaintLocation : undefined;
}

function toComplaintPayload(complaint: ComplaintDocument): ComplaintPayload {
  return {
    id: complaint._id.toString(),
    userId: getComplaintOwnerId(complaint),
    title: complaint.title,
    description: complaint.description,
    location: mapComplaintLocation(complaint.location),
    photo: complaint.photo,
    category: complaint.category,
    status: complaint.status,
    aiSuggestedCategory: complaint.aiSuggestedCategory,
    aiSeverity: complaint.aiSeverity,
    aiSummary: complaint.aiSummary,
    aiKeywords: complaint.aiKeywords ?? [],
    embedding: complaint.embedding ?? [],
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

async function getExistingUser(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return user;
}

function assertComplaintOwnership(
  complaint: ComplaintDocument,
  actor: JwtUserPayload,
): void {
  if (actor.role === "admin") {
    return;
  }

  if (getComplaintOwnerId(complaint) !== actor.userId) {
    throw new AppError("You are not allowed to modify this complaint.", 403);
  }
}

export async function createComplaint(
  userId: string,
  payload: CreateComplaintDto,
): Promise<ComplaintPayload> {
  const normalizedUserId = normalizeObjectId(userId, "user id");
  await getExistingUser(normalizedUserId);

  const normalizedPayload = normalizeCreateComplaintInput(payload);

  // Analyze complaint using AI
  try {
    const analysis = await analyzeComplaint(
      normalizedPayload.description,
      normalizedPayload.photo,
    );

    // Add AI analysis results to payload
    normalizedPayload.aiSuggestedCategory = analysis.category;
    normalizedPayload.aiSeverity = analysis.severity;
    normalizedPayload.aiSummary = analysis.summary;
    normalizedPayload.aiKeywords = analysis.keywords;
  } catch (error) {
    // Log the error but don't fail the complaint creation
    console.error("AI analysis failed:", error);
    // Continue with complaint creation without AI data
  }

  const complaint = await createComplaintRecord(
    normalizedUserId,
    normalizedPayload,
  );

  return toComplaintPayload(complaint);
}

export async function uploadComplaintPhoto(
  file: UploadedComplaintPhoto,
): Promise<string> {
  if (file.size <= 0) {
    throw new AppError("Photo file is required.", 400);
  }

  return uploadToCloudinary({
    buffer: file.buffer,
    mimeType: file.mimetype,
  });
}

export async function getAllComplaints(
  filter?: ComplaintFilterDto,
): Promise<ComplaintPayload[]> {
  const complaints = await getAllComplaintRecords(normalizeComplaintFilter(filter));

  return complaints.map(toComplaintPayload);
}

export async function getMyComplaints(userId: string): Promise<ComplaintPayload[]> {
  const normalizedUserId = normalizeObjectId(userId, "user id");
  await getExistingUser(normalizedUserId);

  const complaints = await getMyComplaintRecords(normalizedUserId);

  return complaints.map(toComplaintPayload);
}

export async function getComplaintById(id: string): Promise<ComplaintPayload> {
  const normalizedComplaintId = normalizeObjectId(id, "complaint id");
  const complaint = await getComplaintRecordById(normalizedComplaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  return toComplaintPayload(complaint);
}

export async function updateComplaint(
  id: string,
  payload: UpdateComplaintDto,
  actor: JwtUserPayload,
): Promise<ComplaintPayload> {
  const normalizedComplaintId = normalizeObjectId(id, "complaint id");
  const normalizedActorId = normalizeObjectId(actor.userId, "user id");
  const actorUser = await getExistingUser(normalizedActorId);

  const existingComplaint = await getComplaintRecordById(normalizedComplaintId);

  if (!existingComplaint) {
    throw new AppError("Complaint not found.", 404);
  }

  const normalizedActor = {
    ...actor,
    userId: normalizedActorId,
    role: actorUser.role,
  };

  assertComplaintOwnership(existingComplaint, normalizedActor);

  const updatedComplaint = await updateComplaintRecord(
    normalizedComplaintId,
    normalizeUpdateComplaintInput(payload, existingComplaint),
    normalizedActorId,
  );

  if (!updatedComplaint) {
    throw new AppError("Complaint could not be updated.", 500);
  }

  return toComplaintPayload(updatedComplaint);
}

export async function deleteComplaint(
  id: string,
  actor: JwtUserPayload,
): Promise<void> {
  const normalizedComplaintId = normalizeObjectId(id, "complaint id");
  const normalizedActorId = normalizeObjectId(actor.userId, "user id");
  const actorUser = await getExistingUser(normalizedActorId);

  const existingComplaint = await getComplaintRecordById(normalizedComplaintId);

  if (!existingComplaint) {
    throw new AppError("Complaint not found.", 404);
  }

  assertComplaintOwnership(existingComplaint, {
    ...actor,
    userId: normalizedActorId,
    role: actorUser.role,
  });

  const deletedComplaint = await deleteComplaintRecord(
    normalizedComplaintId,
    normalizedActorId,
  );

  if (!deletedComplaint) {
    throw new AppError("Complaint could not be deleted.", 500);
  }
}
