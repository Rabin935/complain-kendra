import type { NextFunction, Request, Response } from "express";
import {
  createComplaint as createComplaintService,
  deleteComplaint as deleteComplaintService,
  getAllComplaints as getAllComplaintsService,
  getComplaintById as getComplaintByIdService,
  getMyComplaints as getMyComplaintsService,
  uploadComplaintPhoto as uploadComplaintPhotoService,
  updateComplaint as updateComplaintService,
} from "../services/complaint.service";
import type {
  ComplaintFilterDto,
  ComplaintResponse,
  ComplaintsResponse,
  CreateComplaintDto,
  JwtUserPayload,
  UploadPhotoResponse,
  UpdateComplaintDto,
} from "../types";
import { AppError } from "../utils/appError";

function requireAuthenticatedUser(request: Request): JwtUserPayload {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.user;
}

function getQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

export async function create(
  request: Request<Record<string, never>, unknown, Partial<CreateComplaintDto>>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await createComplaintService(
      requireAuthenticatedUser(request).userId,
      request.body as CreateComplaintDto,
    );

    response.status(201).json({
      success: true,
      message: "Complaint created successfully.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadPhoto(
  request: Request,
  response: Response<UploadPhotoResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    requireAuthenticatedUser(request);

    if (!request.file) {
      throw new AppError("Photo file is required.", 400);
    }

    const photoUrl = await uploadComplaintPhotoService(request.file);

    response.status(200).json({
      success: true,
      message: "Photo uploaded successfully.",
      photoUrl,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  request: Request<Record<string, never>, unknown, unknown, Record<string, unknown>>,
  response: Response<ComplaintsResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const filter: ComplaintFilterDto = {
      ward: getQueryValue(request.query.ward),
      category: getQueryValue(request.query.category) as ComplaintFilterDto["category"],
      status: getQueryValue(request.query.status) as ComplaintFilterDto["status"],
    };
    const complaints = await getAllComplaintsService(filter);

    response.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMy(
  request: Request,
  response: Response<ComplaintsResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaints = await getMyComplaintsService(
      requireAuthenticatedUser(request).userId,
    );

    response.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await getComplaintByIdService(request.params.id);

    response.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(
  request: Request<{ id: string }, unknown, Partial<UpdateComplaintDto>>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await updateComplaintService(
      request.params.id,
      request.body as UpdateComplaintDto,
      requireAuthenticatedUser(request),
    );

    response.status(200).json({
      success: true,
      message: "Complaint updated successfully.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteComplaintController(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteComplaintService(request.params.id, requireAuthenticatedUser(request));

    response.status(200).json({
      success: true,
      message: "Complaint deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export { deleteComplaintController as delete };
