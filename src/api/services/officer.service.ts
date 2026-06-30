import CommentModel from "../models/Comment";
import ComplaintModel from "../models/Complaint";
import EscalationRuleModel from "../models/EscalationRule";
import OfficerModel from "../models/Officer";
import OfficerWarningModel from "../models/OfficerWarning";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";
import {
  escapeRegex,
  getNumber,
  getString,
  isRecord,
  normalizeCategory,
  normalizePriority,
  normalizeStatus,
  parsePagination,
  requireObjectId,
  requireString,
} from "../utils/request.utils";
import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  JwtUserPayload,
} from "../types";
import {
  addTimeline,
  getComplaintTimeline,
  toComplaintPayload,
} from "./complaint.service";
import { createComment } from "./comment.service";
import { createNotification } from "./notification.service";
import { awardPoints } from "./points.service";
import { emitRealtimeEvent } from "../sockets/realtime";
import { buildWardLocation, resolveWardFromPayload } from "./ward.service";

export async function getOfficerProfile(officerId: string) {
  const officer = await OfficerModel.findById(requireObjectId(officerId, "officer id"));

  if (!officer) {
    throw new AppError("Officer not found.", 404);
  }

  return officer;
}

function buildOfficerWardFilter(officer: {
  role: string;
  wardId?: string;
}) {
  return officer.role === "admin" || !officer.wardId ? {} : { "location.wardId": officer.wardId };
}

function buildOfficerComplaintQuery(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  const status = normalizeStatus(query.status);
  const category = normalizeCategory(query.category);
  const priority = normalizePriority(query.priority);
  const ward = getString(query.ward);

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (ward) {
    const wardNumber = ward.replace(/^Ward\s+/i, "");
    filter["location.ward"] = new RegExp(`^(Ward\\s*)?${escapeRegex(wardNumber)}$`, "i");
  }

  return filter;
}

export async function getOfficerDashboard(officer: JwtUserPayload) {
  const officerRecord = await getOfficerProfile(officer.subjectId);
  const wardFilter = buildOfficerWardFilter(officerRecord);
  const [total, pending, inProgress, resolved, critical, recent] = await Promise.all([
    ComplaintModel.countDocuments(wardFilter),
    ComplaintModel.countDocuments({ ...wardFilter, status: "pending" }),
    ComplaintModel.countDocuments({ ...wardFilter, status: "in_progress" }),
    ComplaintModel.countDocuments({ ...wardFilter, status: "resolved" }),
    ComplaintModel.countDocuments({ ...wardFilter, priority: "critical", status: { $ne: "resolved" } }),
    ComplaintModel.find(wardFilter).sort({ createdAt: -1 }).limit(5),
  ]);

  return {
    officer: officerRecord,
    kpis: {
      total,
      pending,
      in_progress: inProgress,
      resolved,
      critical,
    },
    recentComplaints: recent.map((complaint) => toComplaintPayload(complaint)),
  };
}

export async function listOfficerComplaints(
  query: Record<string, unknown>,
  actor: JwtUserPayload,
) {
  const pagination = parsePagination(query);
  const filter = buildOfficerComplaintQuery(query);
  const officerRecord = await getOfficerProfile(actor.subjectId);
  const scopedFilter = { ...buildOfficerWardFilter(officerRecord), ...filter };
  const [complaints, total] = await Promise.all([
    ComplaintModel.find(scopedFilter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ComplaintModel.countDocuments(scopedFilter),
  ]);

  return {
    complaints: complaints.map((complaint) => toComplaintPayload(complaint)),
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

async function assertOfficerCanAccessComplaint(actor: JwtUserPayload, complaint: { location?: { wardId?: string } }) {
  const officer = await getOfficerProfile(actor.subjectId);

  if (officer.role === "admin" || !officer.wardId) {
    return;
  }

  if (complaint.location?.wardId !== officer.wardId) {
    throw new AppError("You can only access complaints from your assigned ward.", 403);
  }
}

export async function getOfficerComplaintDetail(id: string, actor: JwtUserPayload) {
  const complaintId = requireObjectId(id, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(actor, complaint);

  const [timeline, comments] = await Promise.all([
    getComplaintTimeline(complaintId, true),
    CommentModel.find({ complaintId, deletedAt: undefined }).sort({ createdAt: 1 }),
  ]);

  return {
    complaint: toComplaintPayload(complaint),
    timeline,
    comments,
  };
}

async function getActorName(actor: JwtUserPayload): Promise<string> {
  const officer = await OfficerModel.findById(actor.subjectId);
  return officer?.name ?? "Ward officer";
}

export async function updateStatus(input: {
  complaintId: string;
  status: ComplaintStatus;
  reason?: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  const previousStatus = complaint.status;
  complaint.status = input.status;

  if (input.status === "rejected") {
    complaint.rejectionReason = requireString(input.reason, "Rejection reason");
  }

  if (input.status === "resolved") {
    complaint.resolutionNote = input.reason || "Complaint resolved by ward officer.";
  }

  await complaint.save();

  const actorName = await getActorName(input.actor);
  await addTimeline({
    complaintId,
    type:
      input.status === "resolved"
        ? "resolved"
        : input.status === "rejected"
          ? "rejected"
          : "status_changed",
    title: `Status changed to ${input.status.replace("_", " ")}`,
    message: input.reason,
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName,
  });

  if (input.status === "resolved" && previousStatus !== "resolved") {
    await awardPoints({
      userId: complaint.userId.toString(),
      complaintId,
      type: "complaint_resolved",
      reason: "Complaint resolved",
    });
  }

  await createNotification({
    userId: complaint.userId.toString(),
    type: input.status === "resolved" ? "complaint_resolved" : "status_changed",
    title: "Complaint status updated",
    body: `${complaint.complaintNo} is now ${input.status.replace("_", " ")}.`,
    data: { complaintId, complaintNo: complaint.complaintNo, status: input.status },
  });

  emitRealtimeEvent(
    input.status === "resolved" ? "complaint:resolved" : "complaint:status_updated",
    {
      complaintId,
      status: input.status,
      complaintNo: complaint.complaintNo,
    },
  );
  emitRealtimeEvent("officer:queue_updated", { complaintId });

  return toComplaintPayload(complaint);
}

export async function assignOfficer(input: {
  complaintId: string;
  officerId: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const officerId = requireObjectId(input.officerId, "officer id");
  const [complaint, officer] = await Promise.all([
    ComplaintModel.findById(complaintId),
    OfficerModel.findById(officerId),
  ]);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  if (!officer) {
    throw new AppError("Officer not found.", 404);
  }

  complaint.assignedOfficerId = officer._id;
  complaint.assignedOfficerName = officer.name;
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "assigned",
    title: "Officer assigned",
    message: `${officer.name} assigned to this complaint.`,
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName: await getActorName(input.actor),
    isInternal: true,
  });

  emitRealtimeEvent("officer:queue_updated", { complaintId });

  return toComplaintPayload(complaint);
}

export async function updatePriority(input: {
  complaintId: string;
  priority: ComplaintPriority;
  reason?: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  const previousPriority = complaint.priority;
  // Officer changes are treated as manual overrides so the priority engine will not replace them later.
  complaint.priority = input.priority;
  complaint.priorityOverriddenBy = input.actor.subjectId;
  complaint.priorityOverriddenAt = new Date();
  complaint.priorityOverrideReason = input.reason;
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "priority_changed",
    title: `Priority marked ${input.priority}`,
    message: input.reason
      ? `${previousPriority} -> ${input.priority}. ${input.reason}`
      : `${previousPriority} -> ${input.priority}.`,
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName: await getActorName(input.actor),
    isInternal: true,
  });

  return toComplaintPayload(complaint);
}

export async function updateDepartmentAssignment(input: {
  complaintId: string;
  department: string;
  reason?: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  const nextDepartment = requireString(input.department, "Department");
  const previousDepartment = complaint.assignedDepartment;

  // Officer overrides are stored separately from automatic category routing for audit history.
  complaint.assignedDepartment = nextDepartment;
  complaint.departmentOverriddenBy = input.actor.subjectId;
  complaint.departmentOverriddenAt = new Date();
  complaint.departmentOverrideReason = input.reason;
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "department_changed",
    title: "Department assignment updated",
    message: input.reason
      ? `${previousDepartment ?? "Unassigned"} -> ${nextDepartment}. ${input.reason}`
      : `${previousDepartment ?? "Unassigned"} -> ${nextDepartment}.`,
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName: await getActorName(input.actor),
    isInternal: true,
  });

  emitRealtimeEvent("officer:queue_updated", { complaintId });

  return toComplaintPayload(complaint);
}

export async function addInternalNote(input: {
  complaintId: string;
  note: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  return addTimeline({
    complaintId,
    type: "note_added",
    title: "Internal note added",
    message: requireString(input.note, "Note"),
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName: await getActorName(input.actor),
    isInternal: true,
  });
}

export async function addOfficialResponse(input: {
  complaintId: string;
  body: string;
  actor: JwtUserPayload;
}) {
  return createComment({
    complaintId: input.complaintId,
    actor: input.actor,
    body: input.body,
    official: true,
  });
}

export async function analyticsSummary() {
  const [byStatus, byCategory, byWard, totalUsers] = await Promise.all([
    ComplaintModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ComplaintModel.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ComplaintModel.aggregate([{ $group: { _id: "$location.ward", count: { $sum: 1 } } }]),
    UserModel.countDocuments(),
  ]);

  return {
    byStatus,
    byCategory,
    byWard,
    totalUsers,
  };
}

export async function alerts() {
  const staleCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [critical, stale] = await Promise.all([
    ComplaintModel.find({ priority: "critical", status: { $ne: "resolved" } })
      .sort({ createdAt: -1 })
      .limit(20),
    ComplaintModel.find({ status: "pending", createdAt: { $lte: staleCutoff } })
      .sort({ createdAt: 1 })
      .limit(20),
  ]);

  return {
    critical: critical.map((complaint) => toComplaintPayload(complaint)),
    stale: stale.map((complaint) => toComplaintPayload(complaint)),
  };
}

export async function listUsers(query: Record<string, unknown>) {
  const pagination = parsePagination(query);
  const search = getString(query.search);
  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { name: new RegExp(escapeRegex(search), "i") },
      { email: new RegExp(escapeRegex(search), "i") },
    ];
  }

  const [users, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    UserModel.countDocuments(filter),
  ]);

  return {
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      ward: user.ward,
      points: user.points,
      level: user.level,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    })),
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

export async function getUserDetail(userId: string) {
  const user = await UserModel.findById(requireObjectId(userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const [complaints, warnings] = await Promise.all([
    ComplaintModel.find({ userId: user._id.toString() }).sort({ createdAt: -1 }).limit(10),
    OfficerWarningModel.find({ userId: user._id.toString() }).sort({ createdAt: -1 }),
  ]);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      ward: user.ward,
      points: user.points,
      level: user.level,
      levelTitle: user.levelTitle,
      isBanned: user.isBanned,
      banReason: user.banReason,
      createdAt: user.createdAt,
    },
    complaints: complaints.map((complaint) => toComplaintPayload(complaint)),
    warnings,
  };
}

export async function warnUser(input: {
  userId: string;
  actor: JwtUserPayload;
  reason: string;
}) {
  const userId = requireObjectId(input.userId, "user id");
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const warning = await OfficerWarningModel.create({
    userId,
    createdByOfficerId: input.actor.subjectId,
    reason: requireString(input.reason, "Warning reason"),
  });

  await createNotification({
    userId,
    type: "warning",
    title: "Officer warning",
    body: warning.reason,
    data: { warningId: warning._id.toString() },
  });

  return warning;
}

export async function setUserBan(input: {
  userId: string;
  banned: boolean;
  reason?: string;
}) {
  const user = await UserModel.findById(requireObjectId(input.userId, "user id"));

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  user.isBanned = input.banned;
  user.banReason = input.banned ? input.reason || "Banned by officer." : undefined;
  await user.save();

  return user;
}

export async function listEscalationRules() {
  return EscalationRuleModel.find().sort({ createdAt: -1 });
}

export async function createEscalationRule(payload: Record<string, unknown>) {
  return EscalationRuleModel.create({
    name: requireString(payload.name, "Rule name"),
    ward: getString(payload.ward),
    category: normalizeCategory(payload.category) as ComplaintCategory | undefined,
    priority: normalizePriority(payload.priority) as ComplaintPriority | undefined,
    triggerAfterHours: getNumber(payload.triggerAfterHours ?? payload.trigger_after_hours) ?? 24,
    assignToRole: getString(payload.assignToRole ?? payload.assign_to_role) ?? "supervisor",
    active: typeof payload.active === "boolean" ? payload.active : true,
  });
}

export async function updateEscalationRule(id: string, payload: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    updates.name = requireString(payload.name, "Rule name");
  }

  if (payload.ward !== undefined) {
    updates.ward = getString(payload.ward);
  }

  if (payload.category !== undefined) {
    updates.category = normalizeCategory(payload.category);
  }

  if (payload.priority !== undefined) {
    updates.priority = normalizePriority(payload.priority);
  }

  if (payload.triggerAfterHours !== undefined || payload.trigger_after_hours !== undefined) {
    updates.triggerAfterHours =
      getNumber(payload.triggerAfterHours ?? payload.trigger_after_hours) ?? 24;
  }

  if (payload.assignToRole !== undefined || payload.assign_to_role !== undefined) {
    updates.assignToRole = getString(payload.assignToRole ?? payload.assign_to_role);
  }

  if (typeof payload.active === "boolean") {
    updates.active = payload.active;
  }

  const rule = await EscalationRuleModel.findByIdAndUpdate(
    requireObjectId(id, "escalation rule id"),
    updates,
    { new: true, runValidators: true },
  );

  if (!rule) {
    throw new AppError("Escalation rule not found.", 404);
  }

  return rule;
}

export async function deleteEscalationRule(id: string) {
  const rule = await EscalationRuleModel.findByIdAndDelete(
    requireObjectId(id, "escalation rule id"),
  );

  if (!rule) {
    throw new AppError("Escalation rule not found.", 404);
  }
}

export async function updateOfficerSettings(officerId: string, payload: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};

  for (const field of ["name", "phone", "department", "ward"]) {
    if (payload[field] !== undefined) {
      updates[field] = getString(payload[field]);
    }
  }

  const selectedWard = await resolveWardFromPayload(payload, {
    fallbackCity: getString(payload.city),
  });

  if (selectedWard) {
    const location = buildWardLocation(selectedWard);
    updates.ward = location.ward;
    updates.wardId = location.wardId;
    updates.wardNumber = location.wardNumber;
    updates.city = location.city;
    updates.municipality = location.municipality;
  }

  const officer = await OfficerModel.findByIdAndUpdate(
    requireObjectId(officerId, "officer id"),
    updates,
    { new: true, runValidators: true },
  );

  if (!officer) {
    throw new AppError("Officer not found.", 404);
  }

  return officer;
}
