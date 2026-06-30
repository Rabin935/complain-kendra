import bcrypt from "bcryptjs";
import type { PipelineStage } from "mongoose";
import CommentModel from "../models/Comment";
import ComplaintModel from "../models/Complaint";
import ComplaintTimelineModel from "../models/ComplaintTimeline";
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
}): Record<string, unknown> {
  return officer.role === "admin" || !officer.wardId ? {} : { "location.wardId": officer.wardId };
}

function buildOfficerComplaintQuery(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  const search = getString(query.search);
  const status = normalizeStatus(query.status);
  const category = normalizeCategory(query.category);
  const priority = normalizePriority(query.priority);
  const ward = getString(query.ward);
  const wardId = getString(query.wardId ?? query.ward_id);
  const department = getString(query.department ?? query.assignedDepartment);
  const assignedOfficer = getString(
    query.assignedOfficer ?? query.assignedOfficerId ?? query.assigned_officer,
  );

  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$or = [
      { complaintNo: new RegExp(escapedSearch, "i") },
      { title: new RegExp(escapedSearch, "i") },
      { description: new RegExp(escapedSearch, "i") },
    ];
  }

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

  if (wardId) {
    filter["location.wardId"] = wardId;
  }

  if (department) {
    filter.assignedDepartment = new RegExp(`^${escapeRegex(department)}$`, "i");
  }

  if (assignedOfficer === "unassigned") {
    filter.assignedOfficerId = { $exists: false };
  } else if (assignedOfficer) {
    filter.assignedOfficerId = requireObjectId(assignedOfficer, "assigned officer id");
  }

  return filter;
}

export async function getOfficerDashboard(officer: JwtUserPayload) {
  const officerRecord = await getOfficerProfile(officer.subjectId);
  const wardFilter = buildOfficerWardFilter(officerRecord);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [total, pending, inProgress, resolvedToday, highPriority, assignedToMe, recent, urgentQueue, recentActivity] = await Promise.all([
    ComplaintModel.countDocuments(wardFilter),
    ComplaintModel.countDocuments({ ...wardFilter, status: "pending" }),
    ComplaintModel.countDocuments({ ...wardFilter, status: "in_progress" }),
    ComplaintModel.countDocuments({ ...wardFilter, status: "resolved", updatedAt: { $gte: today } }),
    ComplaintModel.countDocuments({
      ...wardFilter,
      priority: { $in: ["high", "critical"] },
      status: { $ne: "resolved" },
    }),
    ComplaintModel.countDocuments({ ...wardFilter, assignedOfficerId: officer.subjectId }),
    ComplaintModel.find(wardFilter).sort({ createdAt: -1 }).limit(5),
    ComplaintModel.find({
      ...wardFilter,
      $or: [
        { priority: { $in: ["high", "critical"] } },
        { "aiAnalysis.confidence": { $gte: 85 } },
        { "aiAnalysis.confidence_score": { $gte: 85 } },
      ],
      status: { $nin: ["resolved", "rejected"] },
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(5),
    ComplaintTimelineModel.find({ isInternal: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8),
  ]);

  return {
    officer: officerRecord,
    kpis: {
      total,
      pending,
      in_progress: inProgress,
      resolved_today: resolvedToday,
      high_priority: highPriority,
      assigned_to_me: assignedToMe,
    },
    recentComplaints: recent.map((complaint) => toComplaintPayload(complaint)),
    urgentQueue: urgentQueue.map((complaint) => toComplaintPayload(complaint)),
    recentActivity,
  };
}

function buildOfficerComplaintSort(sortValue: unknown): Record<string, 1 | -1> {
  const sort = getString(sortValue)?.toLowerCase();

  if (sort === "oldest") {
    return { createdAt: 1 };
  }

  if (sort === "highest_priority" || sort === "priority") {
    // Priority score is numeric when the priority engine has run; createdAt keeps ties stable.
    return { priorityScore: -1, createdAt: -1 };
  }

  if (sort === "ai_confidence") {
    return { "aiAnalysis.confidence": -1, "aiAnalysis.confidence_score": -1, createdAt: -1 };
  }

  return { createdAt: -1 };
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
      .sort(buildOfficerComplaintSort(query.sort))
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

export async function listOfficers(query: Record<string, unknown>, actor: JwtUserPayload) {
  const officerRecord = await getOfficerProfile(actor.subjectId);
  const search = getString(query.search);
  const filter: Record<string, unknown> = { isActive: true };

  if (officerRecord.role !== "admin" && officerRecord.wardId) {
    filter.wardId = officerRecord.wardId;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$or = [
      { name: new RegExp(escapedSearch, "i") },
      { email: new RegExp(escapedSearch, "i") },
      { department: new RegExp(escapedSearch, "i") },
    ];
  }

  const officers = await OfficerModel.find(filter)
    .sort({ role: 1, name: 1 })
    .limit(100);

  return officers.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    email: item.email,
    role: item.role,
    ward: item.ward,
    wardId: item.wardId,
    department: item.department,
    phone: item.phone,
  }));
}

function assertCanManageAssignment(actor: JwtUserPayload): void {
  if (actor.role !== "supervisor" && actor.role !== "admin") {
    throw new AppError("Only supervisors and administrators can manage assignments.", 403);
  }
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

type WorkflowAction = "accept" | "start_work" | "resolve" | "reject" | "reopen" | "status_update";

const workflowStatusByAction: Record<WorkflowAction, ComplaintStatus | undefined> = {
  accept: "accepted",
  start_work: "in_progress",
  resolve: "resolved",
  reject: "rejected",
  reopen: "in_progress",
  status_update: undefined,
};

const workflowTimelineByStatus: Record<ComplaintStatus, Parameters<typeof addTimeline>[0]["type"]> = {
  pending: "status_changed",
  accepted: "accepted",
  in_progress: "work_started",
  resolved: "resolved",
  rejected: "rejected",
};

const allowedWorkflowTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ["accepted", "in_progress", "rejected"],
  accepted: ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["in_progress"],
  rejected: ["in_progress"],
};

function assertWorkflowTransition(previous: ComplaintStatus, next: ComplaintStatus): void {
  if (previous === next) {
    return;
  }

  if (!allowedWorkflowTransitions[previous]?.includes(next)) {
    throw new AppError(`Cannot move complaint from ${previous} to ${next}.`, 400);
  }
}

function workflowMessage(status: ComplaintStatus, reason?: string): string {
  if (status === "accepted") {
    return "Your complaint has been accepted by the ward office.";
  }

  if (status === "in_progress") {
    return reason || "Work has started on your complaint.";
  }

  if (status === "resolved") {
    return reason || "Your complaint has been marked resolved.";
  }

  if (status === "rejected") {
    return reason || "Your complaint has been rejected.";
  }

  return reason || "Your complaint status was updated.";
}

async function applyComplaintWorkflow(input: {
  complaintId: string;
  status: ComplaintStatus;
  reason?: string;
  action?: WorkflowAction;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  const previousStatus = complaint.status;
  assertWorkflowTransition(previousStatus, input.status);

  // This is the single workflow state writer so all status changes create the same side effects.
  complaint.status = input.status;

  if (input.status === "rejected") {
    complaint.rejectionReason = requireString(input.reason, "Rejection reason");
    complaint.resolutionNote = undefined;
  } else if (input.status === "resolved") {
    complaint.resolutionNote = input.reason || "Complaint resolved by ward officer.";
    complaint.rejectionReason = undefined;
  } else if (input.action === "reopen") {
    complaint.rejectionReason = undefined;
    complaint.resolutionNote = undefined;
  }

  await complaint.save();

  const actorName = await getActorName(input.actor);
  const timelineType =
    input.action === "reopen" ? "reopened" : workflowTimelineByStatus[input.status];

  await addTimeline({
    complaintId,
    type: timelineType,
    title:
      input.action === "reopen"
        ? "Complaint reopened"
        : `Status changed to ${input.status.replace("_", " ")}`,
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
    title:
      input.action === "reopen"
        ? "Complaint reopened"
        : `Complaint ${input.status.replace("_", " ")}`,
    body: workflowMessage(input.status, input.reason),
    data: {
      complaintId,
      complaintNo: complaint.complaintNo,
      previousStatus,
      status: input.status,
      action: input.action ?? "status_update",
    },
  });

  emitRealtimeEvent(
    input.status === "resolved" ? "complaint:resolved" : "complaint:status_updated",
    {
      complaintId,
      userId: complaint.userId.toString(),
      officerId: complaint.assignedOfficerId?.toString(),
      wardId: complaint.location?.wardId,
      status: input.status,
      previousStatus,
      complaintNo: complaint.complaintNo,
    },
  );
  emitRealtimeEvent("officer:queue_updated", {
    complaintId,
    officerId: complaint.assignedOfficerId?.toString(),
    wardId: complaint.location?.wardId,
  });

  return toComplaintPayload(complaint);
}

export async function updateStatus(input: {
  complaintId: string;
  status: ComplaintStatus;
  reason?: string;
  actor: JwtUserPayload;
}) {
  return applyComplaintWorkflow({
    ...input,
    action: "status_update",
  });
}

export async function runWorkflowAction(input: {
  complaintId: string;
  action: Exclude<WorkflowAction, "status_update">;
  reason?: string;
  actor: JwtUserPayload;
}) {
  const status = workflowStatusByAction[input.action];

  if (!status) {
    throw new AppError("Unsupported workflow action.", 400);
  }

  return applyComplaintWorkflow({
    complaintId: input.complaintId,
    status,
    reason: input.reason,
    action: input.action,
    actor: input.actor,
  });
}

export async function assignOfficer(input: {
  complaintId: string;
  officerId: string;
  actor: JwtUserPayload;
}) {
  assertCanManageAssignment(input.actor);
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

  await createNotification({
    userId: complaint.userId.toString(),
    type: "status_changed",
    title: "Officer assigned",
    body: `${officer.name} has been assigned to ${complaint.complaintNo}.`,
    data: {
      complaintId,
      complaintNo: complaint.complaintNo,
      officerId,
      officerName: officer.name,
      action: "assign_officer",
    },
  });

  emitRealtimeEvent("officer:queue_updated", {
    complaintId,
    officerId,
    wardId: complaint.location?.wardId,
  });

  return toComplaintPayload(complaint);
}

export async function removeAssignment(input: {
  complaintId: string;
  actor: JwtUserPayload;
}) {
  assertCanManageAssignment(input.actor);
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const complaint = await ComplaintModel.findById(complaintId);

  if (!complaint) {
    throw new AppError("Complaint not found.", 404);
  }

  await assertOfficerCanAccessComplaint(input.actor, complaint);

  const previousOfficer = complaint.assignedOfficerName;
  complaint.assignedOfficerId = undefined;
  complaint.assignedOfficerName = undefined;
  await complaint.save();

  await addTimeline({
    complaintId,
    type: "assigned",
    title: "Officer assignment removed",
    message: previousOfficer
      ? `${previousOfficer} was removed from this complaint.`
      : "Complaint moved back to the unassigned queue.",
    actorType: "officer",
    actorId: input.actor.subjectId,
    actorName: await getActorName(input.actor),
    isInternal: true,
  });

  emitRealtimeEvent("officer:queue_updated", {
    complaintId,
    wardId: complaint.location?.wardId,
  });

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

  emitRealtimeEvent("officer:queue_updated", {
    complaintId,
    officerId: complaint.assignedOfficerId?.toString(),
    wardId: complaint.location?.wardId,
  });

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

export async function updateInternalNote(input: {
  complaintId: string;
  noteId: string;
  note: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  await getOfficerComplaintDetail(complaintId, input.actor);
  const note = await ComplaintTimelineModel.findOne({
    _id: requireObjectId(input.noteId, "note id"),
    complaintId,
    type: "note_added",
    deletedAt: undefined,
  });

  if (!note) {
    throw new AppError("Internal note not found.", 404);
  }

  if (note.actorId?.toString() !== input.actor.subjectId) {
    throw new AppError("You can only edit your own note.", 403);
  }

  note.message = requireString(input.note, "Note");
  await note.save();

  return note;
}

export async function deleteInternalNote(input: {
  complaintId: string;
  noteId: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  await getOfficerComplaintDetail(complaintId, input.actor);
  const note = await ComplaintTimelineModel.findOne({
    _id: requireObjectId(input.noteId, "note id"),
    complaintId,
    type: "note_added",
    deletedAt: undefined,
  });

  if (!note) {
    throw new AppError("Internal note not found.", 404);
  }

  const canDelete = note.actorId?.toString() === input.actor.subjectId || input.actor.role === "admin";

  if (!canDelete) {
    throw new AppError("You can only delete your own note.", 403);
  }

  note.deletedAt = new Date();
  await note.save();
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

export async function analyticsSummary(actor?: JwtUserPayload, query: Record<string, unknown> = {}) {
  const officerRecord = actor ? await getOfficerProfile(actor.subjectId) : undefined;
  const wardFilter: Record<string, unknown> = officerRecord ? buildOfficerWardFilter(officerRecord) : {};
  const category = normalizeCategory(query.category);
  const ward = getString(query.ward);
  const fromDate = getString(query.from ?? query.startDate ?? query.start_date);
  const toDate = getString(query.to ?? query.endDate ?? query.end_date);

  if (ward && !wardFilter["location.wardId"]) {
    const wardNumber = ward.replace(/^Ward\s+/i, "");
    wardFilter["location.ward"] = new RegExp(`^(Ward\\s*)?${escapeRegex(wardNumber)}$`, "i");
  }

  if (category) {
    wardFilter.category = category;
  }

  if (fromDate || toDate) {
    const createdAt: Record<string, Date> = {};
    const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
    const parsedToDate = toDate ? new Date(toDate) : undefined;

    if (parsedFromDate && !Number.isNaN(parsedFromDate.getTime())) {
      createdAt.$gte = parsedFromDate;
    }

    if (parsedToDate && !Number.isNaN(parsedToDate.getTime())) {
      parsedToDate.setHours(23, 59, 59, 999);
      createdAt.$lte = parsedToDate;
    }

    if (Object.keys(createdAt).length > 0) {
      wardFilter.createdAt = createdAt;
    }
  }

  const openStatusFilter = { status: { $in: ["pending", "accepted", "in_progress"] } };
  const resolvedStatusFilter = { status: "resolved" };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const groupCount = (field: string): PipelineStage[] => [
    { $match: wardFilter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 as const } },
  ];

  const [
    openComplaints,
    resolvedComplaints,
    averageResolution,
    byStatus,
    byCategory,
    byWard,
    priorityDistribution,
    departmentWorkload,
    totalUsers,
    monthlyTotal,
    monthlyResolved,
    resolutionTrend,
    dailyVolume,
    aiCategoryDistribution,
    officerPerformance,
  ] = await Promise.all([
    ComplaintModel.countDocuments({ ...wardFilter, ...openStatusFilter }),
    ComplaintModel.countDocuments({ ...wardFilter, ...resolvedStatusFilter }),
    ComplaintTimelineModel.aggregate([
      { $match: { type: "resolved" } },
      // A reopened complaint can be resolved multiple times; use the first resolution for duration.
      { $group: { _id: "$complaintId", resolvedAt: { $min: "$createdAt" } } },
      {
        $lookup: {
          from: "complaints",
          localField: "_id",
          foreignField: "_id",
          as: "complaint",
        },
      },
      { $unwind: "$complaint" },
      { $match: { "complaint.status": "resolved", ...prefixComplaintFilter(wardFilter) } },
      {
        $project: {
          resolutionTimeMs: { $subtract: ["$resolvedAt", "$complaint.createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          averageMs: { $avg: "$resolutionTimeMs" },
          count: { $sum: 1 },
        },
      },
    ]),
    ComplaintModel.aggregate(groupCount("status")),
    ComplaintModel.aggregate(groupCount("category")),
    ComplaintModel.aggregate(groupCount("location.ward")),
    ComplaintModel.aggregate(groupCount("priority")),
    ComplaintModel.aggregate([
      { $match: wardFilter },
      {
        $group: {
          _id: { $ifNull: ["$assignedDepartment", "Unassigned"] },
          total: { $sum: 1 },
          open: {
            $sum: {
              $cond: [{ $in: ["$status", ["pending", "accepted", "in_progress"]] }, 1, 0],
            },
          },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ["$priority", "critical"] }, 1, 0] } },
        },
      },
      { $sort: { open: -1, total: -1, _id: 1 } },
    ]),
    UserModel.countDocuments(),
    ComplaintModel.countDocuments({ ...wardFilter, createdAt: { $gte: monthStart } }),
    ComplaintModel.countDocuments({ ...wardFilter, status: "resolved", updatedAt: { $gte: monthStart } }),
    ComplaintModel.aggregate([
      { $match: { ...wardFilter, status: "resolved" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ]),
    ComplaintModel.aggregate([
      { $match: wardFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ]),
    ComplaintModel.aggregate([
      { $match: { ...wardFilter, "aiAnalysis.detectedCategory": { $exists: true } } },
      { $group: { _id: "$aiAnalysis.detectedCategory", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 as const } },
    ]),
    ComplaintModel.aggregate([
      { $match: { ...wardFilter, assignedOfficerName: { $exists: true } } },
      {
        $group: {
          _id: "$assignedOfficerName",
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          active: {
            $sum: {
              $cond: [{ $in: ["$status", ["pending", "accepted", "in_progress"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { resolved: -1, total: -1, _id: 1 } },
    ]),
  ]);
  const averageResolutionMs = averageResolution[0]?.averageMs ?? 0;
  const monthlyResolutionRate =
    monthlyTotal > 0 ? Number(((monthlyResolved / monthlyTotal) * 100).toFixed(1)) : 0;

  return {
    scope: {
      ward: officerRecord?.ward,
      wardId: officerRecord?.wardId,
      department: officerRecord?.department,
    },
    openComplaints,
    resolvedComplaints,
    averageResolutionTime: {
      milliseconds: Math.round(averageResolutionMs),
      hours: Number((averageResolutionMs / (1000 * 60 * 60)).toFixed(2)),
      days: Number((averageResolutionMs / (1000 * 60 * 60 * 24)).toFixed(2)),
      sampleSize: averageResolution[0]?.count ?? 0,
    },
    byStatus,
    byCategory,
    byWard,
    priorityDistribution,
    departmentWorkload,
    monthlyResolutionRate,
    aiCategoryDistribution,
    officerPerformance,
    resolutionTrend,
    dailyVolume,
    totalUsers,
  };
}

function prefixComplaintFilter(filter: Record<string, unknown>) {
  // Timeline analytics joins complaints under "complaint", so ward scoping needs that prefix.
  return Object.fromEntries(
    Object.entries(filter).map(([key, value]) => [`complaint.${key}`, value]),
  );
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
  const status = getString(query.status);
  const ward = getString(query.ward);
  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { name: new RegExp(escapeRegex(search), "i") },
      { email: new RegExp(escapeRegex(search), "i") },
    ];
  }

  if (status === "banned") {
    filter.isBanned = true;
  } else if (status === "active") {
    filter.isBanned = false;
  }

  if (ward) {
    const wardNumber = ward.replace(/^Ward\s+/i, "");
    filter.ward = new RegExp(`^(Ward\\s*)?${escapeRegex(wardNumber)}$`, "i");
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

  for (const field of ["name", "phone", "department", "ward", "avatarUrl"]) {
    if (payload[field] !== undefined) {
      updates[field] = getString(payload[field]);
    }
  }

  if (isRecord(payload.notificationPreferences)) {
    for (const field of [
      "inApp",
      "email",
      "push",
      "assignmentUpdates",
      "urgentAlerts",
      "dailyDigest",
    ]) {
      const value = payload.notificationPreferences[field];

      if (typeof value === "boolean") {
        updates[`notificationPreferences.${field}`] = value;
      }
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

  const officerObjectId = requireObjectId(officerId, "officer id");
  const currentPassword = getString(payload.currentPassword);
  const newPassword = getString(payload.newPassword);
  const officer = await OfficerModel.findById(officerObjectId);

  if (!officer) {
    throw new AppError("Officer not found.", 404);
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters.", 400);
    }

    if (!currentPassword || !(await bcrypt.compare(currentPassword, officer.password))) {
      throw new AppError("Current password is incorrect.", 400);
    }

    officer.password = newPassword;
  }

  officer.set(updates);
  await officer.save();

  return officer;
}
