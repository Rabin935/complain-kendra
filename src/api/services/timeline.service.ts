import { isValidObjectId } from "mongoose";
import ComplaintTimelineModel, {
  type ComplaintTimelineDocument,
  type CreateTimelineEventInput,
} from "../models/ComplaintTimeline";
import type { ComplaintTimelineEvent } from "../types";
import { AppError } from "../utils/appError";

function normalizeObjectId(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue || !isValidObjectId(normalizedValue)) {
    throw new AppError(`Invalid ${fieldName}.`, 400);
  }

  return normalizedValue;
}

function toTimelinePayload(
  document: ComplaintTimelineDocument,
): ComplaintTimelineEvent {
  return {
    id: document._id.toString(),
    complaintId: document.complaintId.toString(),
    type: document.type,
    title: document.title,
    message: document.message,
    actorType: document.actorType,
    actorId: document.actorId ? document.actorId.toString() : undefined,
    metadata: document.metadata,
    createdAt: document.createdAt,
  };
}

export async function addTimelineEvent(
  input: CreateTimelineEventInput,
): Promise<ComplaintTimelineEvent> {
  const event = await ComplaintTimelineModel.create({
    complaintId: normalizeObjectId(input.complaintId, "complaint id"),
    type: input.type,
    title: input.title,
    message: input.message,
    actorType: input.actorType ?? "system",
    actorId: input.actorId ? normalizeObjectId(input.actorId, "actor id") : undefined,
    metadata: input.metadata,
  });

  return toTimelinePayload(event);
}

export async function getComplaintTimeline(
  complaintId: string,
): Promise<ComplaintTimelineEvent[]> {
  const normalizedComplaintId = normalizeObjectId(complaintId, "complaint id");
  const events = await ComplaintTimelineModel.find({
    complaintId: normalizedComplaintId,
  })
    .sort({ createdAt: 1 })
    .exec();

  return events.map((event) => toTimelinePayload(event));
}
