import ComplaintModel, { ComplaintDocument } from "../models/Complaint";
import type { ComplaintFilterDto, CreateComplaintDto, UpdateComplaintDto } from "../types";
import { findUserById } from "./user.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildOwnershipQuery(
  complaintId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const normalizedUserId = userId.trim();
  const actor = await findUserById(normalizedUserId);

  if (actor?.role === "admin") {
    return { _id: complaintId.trim() };
  }

  return {
    _id: complaintId.trim(),
    userId: normalizedUserId,
  };
}

export async function createComplaint(
  userId: string,
  data: CreateComplaintDto,
): Promise<ComplaintDocument> {
  return ComplaintModel.create({
    ...data,
    userId: userId.trim(),
  });
}

export async function getAllComplaints(
  filter: ComplaintFilterDto = {},
): Promise<ComplaintDocument[]> {
  const query: Record<string, unknown> = {};

  if (filter.ward) {
    query["location.ward"] = new RegExp(`^${escapeRegex(filter.ward)}$`, "i");
  }

  if (filter.category) {
    query.category = filter.category;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  return ComplaintModel.find(query).sort({ createdAt: -1 });
}

export async function getMyComplaints(userId: string): Promise<ComplaintDocument[]> {
  return ComplaintModel.find({ userId: userId.trim() }).sort({ createdAt: -1 });
}

export async function getComplaintById(id: string): Promise<ComplaintDocument | null> {
  return ComplaintModel.findById(id.trim());
}

export async function updateComplaint(
  id: string,
  data: UpdateComplaintDto,
  userId: string,
): Promise<ComplaintDocument | null> {
  const ownershipQuery = await buildOwnershipQuery(id, userId);

  return ComplaintModel.findOneAndUpdate(ownershipQuery, data, {
    new: true,
    runValidators: true,
  });
}

export async function deleteComplaint(
  id: string,
  userId: string,
): Promise<ComplaintDocument | null> {
  const ownershipQuery = await buildOwnershipQuery(id, userId);

  return ComplaintModel.findOneAndDelete(ownershipQuery);
}
