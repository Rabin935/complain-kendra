import type { NextFunction, Request, Response } from "express";
import {
  addInternalNote,
  addOfficialResponse,
  alerts as alertsService,
  analyticsSummary,
  assignOfficer,
  createEscalationRule,
  deleteEscalationRule,
  getOfficerComplaintDetail,
  getOfficerDashboard,
  getOfficerProfile,
  getUserDetail,
  listEscalationRules,
  listOfficerComplaints,
  listUsers,
  setUserBan,
  updateEscalationRule,
  updateOfficerSettings,
  updatePriority,
  updateStatus,
  warnUser,
} from "../services/officer.service";
import { AppError } from "../utils/appError";
import type { ComplaintPriority, ComplaintStatus } from "../types";
import {
  getNumber,
  getString,
  normalizePriority,
  normalizeStatus,
} from "../utils/request.utils";

function requireOfficerUser(request: Request) {
  if (!request.user || request.user.type !== "officer") {
    throw new AppError("Officer authentication is required.", 401);
  }

  return request.user;
}

export async function dashboard(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await getOfficerDashboard(requireOfficerUser(request));

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function complaints(request: Request, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const result = await listOfficerComplaints(request.query as Record<string, unknown>);

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function complaintDetail(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    requireOfficerUser(request);
    const result = await getOfficerComplaintDetail(request.params.id);

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchStatus(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const status = normalizeStatus(
      (request.body as Record<string, unknown>).status,
      true,
    ) as ComplaintStatus;
    const complaint = await updateStatus({
      complaintId: request.params.id,
      status,
      reason: getString(
        (request.body as Record<string, unknown>).reason ??
          (request.body as Record<string, unknown>).resolutionNote,
      ),
      actor: requireOfficerUser(request),
    });

    response.status(200).json({
      success: true,
      message: "Complaint status updated.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchAssign(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const officerId = getString(
      (request.body as Record<string, unknown>).officerId ??
        (request.body as Record<string, unknown>).officer_id,
    );

    if (!officerId) {
      throw new AppError("Officer id is required.", 400);
    }

    const complaint = await assignOfficer({
      complaintId: request.params.id,
      officerId,
      actor: requireOfficerUser(request),
    });

    response.status(200).json({
      success: true,
      message: "Officer assigned.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchPriority(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const priority = normalizePriority(
      (request.body as Record<string, unknown>).priority,
      true,
    ) as ComplaintPriority;
    const complaint = await updatePriority({
      complaintId: request.params.id,
      priority,
      actor: requireOfficerUser(request),
    });

    response.status(200).json({
      success: true,
      message: "Complaint priority updated.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function note(request: Request<{ id: string }>, response: Response, next: NextFunction) {
  try {
    const result = await addInternalNote({
      complaintId: request.params.id,
      note: getString((request.body as Record<string, unknown>).note) ?? "",
      actor: requireOfficerUser(request),
    });

    response.status(201).json({
      success: true,
      message: "Internal note added.",
      note: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function officialComment(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const comment = await addOfficialResponse({
      complaintId: request.params.id,
      body: getString((request.body as Record<string, unknown>).body) ?? "",
      actor: requireOfficerUser(request),
    });

    response.status(201).json({
      success: true,
      message: "Official response added.",
      comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function analytics(_request: Request, response: Response, next: NextFunction) {
  try {
    const result = await analyticsSummary();

    response.status(200).json({
      success: true,
      analytics: result,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function alerts(request: Request, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const result = await alertsService();

    response.status(200).json({
      success: true,
      alerts: result,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function users(request: Request, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const result = await listUsers(request.query as Record<string, unknown>);

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function userDetail(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    requireOfficerUser(request);
    const result = await getUserDetail(request.params.id);

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function warn(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    const warning = await warnUser({
      userId: request.params.id,
      actor: requireOfficerUser(request),
      reason: getString((request.body as Record<string, unknown>).reason) ?? "",
    });

    response.status(201).json({
      success: true,
      message: "User warned.",
      warning,
    });
  } catch (error) {
    next(error);
  }
}

export async function ban(request: Request<{ id: string }>, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const user = await setUserBan({
      userId: request.params.id,
      banned: true,
      reason: getString((request.body as Record<string, unknown>).reason),
    });

    response.status(200).json({
      success: true,
      message: "User banned.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function unban(request: Request<{ id: string }>, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const user = await setUserBan({
      userId: request.params.id,
      banned: false,
    });

    response.status(200).json({
      success: true,
      message: "User unbanned.",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function escalationRules(request: Request, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const rules = await listEscalationRules();

    response.status(200).json({
      success: true,
      escalationRules: rules,
      rules,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRule(request: Request, response: Response, next: NextFunction) {
  try {
    requireOfficerUser(request);
    const rule = await createEscalationRule(request.body as Record<string, unknown>);

    response.status(201).json({
      success: true,
      message: "Escalation rule created.",
      rule,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchRule(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    requireOfficerUser(request);
    const rule = await updateEscalationRule(
      request.params.id,
      request.body as Record<string, unknown>,
    );

    response.status(200).json({
      success: true,
      message: "Escalation rule updated.",
      rule,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeRule(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    requireOfficerUser(request);
    await deleteEscalationRule(request.params.id);

    response.status(200).json({
      success: true,
      message: "Escalation rule deleted.",
    });
  } catch (error) {
    next(error);
  }
}

export async function settings(request: Request, response: Response, next: NextFunction) {
  try {
    const officer = await getOfficerProfile(requireOfficerUser(request).subjectId);

    response.status(200).json({
      success: true,
      officer,
      settings: officer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(request: Request, response: Response, next: NextFunction) {
  try {
    const officer = await updateOfficerSettings(
      requireOfficerUser(request).subjectId,
      request.body as Record<string, unknown>,
    );

    response.status(200).json({
      success: true,
      message: "Officer settings updated.",
      officer,
      settings: officer,
    });
  } catch (error) {
    next(error);
  }
}
