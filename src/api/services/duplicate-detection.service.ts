import ComplaintModel, { type ComplaintDocument } from "../models/Complaint";
import type { ComplaintCategory } from "../types";

export interface DuplicateDetectionInput {
  category: ComplaintCategory;
  description: string;
  lat?: number;
  lng?: number;
  wardId?: string;
  submittedAt?: Date;
  excludeComplaintId?: string;
}

export interface DuplicateDetectionResult {
  duplicate_found: boolean;
  duplicate_complaint_id?: string;
  duplicate_complaint_no?: string;
  duplicate_title?: string;
  similarity_score: number;
  distance_meters?: number;
}

const DUPLICATE_THRESHOLD = 0.68;
const RECENT_WINDOW_DAYS = 30;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function descriptionSimilarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;

  return intersection / union;
}

function getDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function locationSimilarity(input: DuplicateDetectionInput, complaint: ComplaintDocument) {
  const complaintLat = complaint.location?.lat;
  const complaintLng = complaint.location?.lng;

  if (
    typeof input.lat === "number" &&
    typeof input.lng === "number" &&
    typeof complaintLat === "number" &&
    typeof complaintLng === "number"
  ) {
    const distanceMeters = getDistanceMeters(
      { lat: input.lat, lng: input.lng },
      { lat: complaintLat, lng: complaintLng },
    );

    // Nearby complaints are much more likely to be duplicates; score fades to 0 at 1.5 km.
    return {
      score: Math.max(0, 1 - distanceMeters / 1500),
      distanceMeters: Math.round(distanceMeters),
    };
  }

  if (input.wardId && complaint.location?.wardId === input.wardId) {
    return { score: 0.55 };
  }

  return { score: 0 };
}

function dateSimilarity(submittedAt: Date, existingDate: Date): number {
  const ageDays = Math.abs(submittedAt.getTime() - existingDate.getTime()) / (24 * 60 * 60 * 1000);

  if (ageDays <= 7) {
    return 1;
  }

  if (ageDays <= RECENT_WINDOW_DAYS) {
    return 0.7;
  }

  return 0.25;
}

export async function detectDuplicateComplaint(
  input: DuplicateDetectionInput,
): Promise<DuplicateDetectionResult> {
  const submittedAt = input.submittedAt ?? new Date();
  const recentCutoff = new Date(submittedAt.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const query: Record<string, unknown> = {
    category: input.category,
    status: { $nin: ["resolved", "rejected"] },
    createdAt: { $gte: recentCutoff },
  };

  if (input.excludeComplaintId) {
    query._id = { $ne: input.excludeComplaintId };
  }

  if (input.wardId) {
    query["location.wardId"] = input.wardId;
  }

  const candidates = await ComplaintModel.find(query).sort({ createdAt: -1 }).limit(25);
  let best: DuplicateDetectionResult = {
    duplicate_found: false,
    similarity_score: 0,
  };

  for (const candidate of candidates) {
    const location = locationSimilarity(input, candidate);
    const textScore = descriptionSimilarity(input.description, candidate.description);
    const createdAt = candidate.createdAt ?? new Date(0);
    const recencyScore = dateSimilarity(submittedAt, createdAt);
    const categoryScore = candidate.category === input.category ? 1 : 0;

    // Weighted score compares all requested signals: category, location, description, and date.
    const similarityScore =
      categoryScore * 0.2 + location.score * 0.35 + textScore * 0.3 + recencyScore * 0.15;

    if (similarityScore > best.similarity_score) {
      best = {
        duplicate_found: similarityScore >= DUPLICATE_THRESHOLD,
        duplicate_complaint_id: candidate._id.toString(),
        duplicate_complaint_no: candidate.complaintNo,
        duplicate_title: candidate.title,
        similarity_score: Number(similarityScore.toFixed(2)),
        distance_meters: location.distanceMeters,
      };
    }
  }

  return best.duplicate_found
    ? best
    : {
        duplicate_found: false,
        duplicate_complaint_id: best.duplicate_complaint_id,
        duplicate_complaint_no: best.duplicate_complaint_no,
        duplicate_title: best.duplicate_title,
        similarity_score: best.similarity_score,
        distance_meters: best.distance_meters,
      };
}

