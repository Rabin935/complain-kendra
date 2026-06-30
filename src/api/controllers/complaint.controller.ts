import type { NextFunction, Request, Response } from "express";
import { analyzeComplaint as analyzeComplaintService } from "../services/ai.service";
import { detectDuplicateComplaint } from "../services/duplicate-detection.service";
import {
  createComplaint as createComplaintService,
  deleteComplaint as deleteComplaintService,
  followComplaint as followComplaintService,
  getAllComplaints as getAllComplaintsService,
  getComplaintDetail as getComplaintDetailService,
  getComplaintRating as getComplaintRatingService,
  getComplaintRatingSummary as getComplaintRatingSummaryService,
  getComplaintTimeline as getComplaintTimelineService,
  getMyComplaints as getMyComplaintsService,
  getNearbyComplaints as getNearbyComplaintsService,
  rateComplaint as rateComplaintService,
  removeComplaintUpvote as removeComplaintUpvoteService,
  unfollowComplaint as unfollowComplaintService,
  updateComplaint as updateComplaintService,
  uploadComplaintPhoto as uploadComplaintPhotoService,
  uploadComplaintPhotos,
  upvoteComplaint as upvoteComplaintService,
} from "../services/complaint.service";
import type {
  ComplaintFilterDto,
  ComplaintResponse,
  ComplaintsResponse,
  CreateComplaintDto,
  JwtUserPayload,
  UpdateComplaintDto,
  UploadPhotoResponse,
} from "../types";
import { AppError } from "../utils/appError";
import {
  getNumber,
  getString,
  normalizeCategory,
  normalizePriority,
  normalizeStatus,
} from "../utils/request.utils";

type UploadedFile = Express.Multer.File;

function requireAuthenticatedUser(request: Request): JwtUserPayload {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.user;
}

function getQueryFilter(request: Request): ComplaintFilterDto {
  const query = request.query as Record<string, unknown>;

  return {
    search: getString(query.search ?? query.q),
    ward: getString(query.ward),
    wardId: getString(query.ward_id ?? query.wardId),
    city: getString(query.city),
    category: normalizeCategory(query.category),
    status: normalizeStatus(query.status),
    priority: normalizePriority(query.priority),
    sort: getString(query.sort) as ComplaintFilterDto["sort"],
    lat: getNumber(query.lat),
    lng: getNumber(query.lng),
    page: getNumber(query.page),
    limit: getNumber(query.limit),
  };
}

function getUploadedFiles(request: Request): UploadedFile[] {
  if (Array.isArray(request.files)) {
    return request.files;
  }

  if (request.files && typeof request.files === "object") {
    return Object.values(request.files).flat();
  }

  if (request.file) {
    return [request.file];
  }

  return [];
}

export async function create(
  request: Request<Record<string, never>, unknown, Partial<CreateComplaintDto>>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireAuthenticatedUser(request);
    const uploadedFiles = getUploadedFiles(request);
    const photos = uploadedFiles.length ? await uploadComplaintPhotos(uploadedFiles) : [];
    const body = {
      ...(request.body as Record<string, unknown>),
      photos: photos.length ? photos : (request.body as Record<string, unknown>).photos,
      photo: photos[0] ?? (request.body as Record<string, unknown>).photo,
    };
    const complaint = await createComplaintService(user.subjectId, body);

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
      photoUrls: [photoUrl],
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadPhotos(
  request: Request,
  response: Response<UploadPhotoResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    requireAuthenticatedUser(request);
    const files = getUploadedFiles(request);

    if (files.length === 0) {
      throw new AppError("At least one photo file is required.", 400);
    }

    const photoUrls = await uploadComplaintPhotos(files);

    response.status(200).json({
      success: true,
      message: "Photos uploaded successfully.",
      photoUrl: photoUrls[0],
      photoUrls,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  request: Request,
  response: Response<ComplaintsResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getAllComplaintsService(getQueryFilter(request), request.user);

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNearby(
  request: Request,
  response: Response<ComplaintsResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const query = request.query as Record<string, unknown>;
    const lat = getNumber(query.lat);
    const lng = getNumber(query.lng);

    if (lat === undefined || lng === undefined) {
      throw new AppError("lat and lng query parameters are required.", 400);
    }

    const complaints = await getNearbyComplaintsService({
      lat,
      lng,
      radiusKm: getNumber(query.radius_km ?? query.radiusKm),
      actor: request.user,
    });

    response.status(200).json({
      success: true,
      complaints,
      total: complaints.length,
      page: 1,
      limit: complaints.length,
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
    const result = await getMyComplaintsService(
      requireAuthenticatedUser(request).subjectId,
      getQueryFilter(request),
    );

    response.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await getComplaintDetailService(request.params.id, request.user);

    response.status(200).json({
      success: true,
      ...detail,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTimeline(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const includeInternal = request.user?.type === "officer";
    const timeline = await getComplaintTimelineService(request.params.id, includeInternal);

    response.status(200).json({
      success: true,
      timeline,
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

export async function analyze(
  request: Request<Record<string, never>, unknown, Record<string, unknown>>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    requireAuthenticatedUser(request);
    const description = getString(request.body.description);

    if (!description) {
      throw new AppError("Description is required for analysis.", 400);
    }

    const analysis = await analyzeComplaintService({
      title: getString(request.body.title),
      description,
      category: normalizeCategory(request.body.category),
      lat: getNumber(request.body.lat),
      lng: getNumber(request.body.lng),
      photoCount: getNumber(request.body.photo_count ?? request.body.photoCount),
      photoUrl: getString(request.body.photoUrl ?? request.body.photo_url),
    });
    const duplicate = await detectDuplicateComplaint({
      category: analysis.detectedCategory,
      description,
      lat: getNumber(request.body.lat),
      lng: getNumber(request.body.lng),
      wardId: getString(request.body.wardId ?? request.body.ward_id),
    });
    const analysisWithDuplicate = {
      ...analysis,
      duplicate_found: duplicate.duplicate_found,
      duplicate_complaint_id: duplicate.duplicate_complaint_id,
      similarity_score: duplicate.similarity_score,
      duplicateCheck: {
        ...analysis.duplicateCheck,
        isDuplicate: duplicate.duplicate_found,
        complaintId: duplicate.duplicate_complaint_id,
        complaintNo: duplicate.duplicate_complaint_no,
        title: duplicate.duplicate_title,
        distanceMeters: duplicate.distance_meters,
        probability: duplicate.similarity_score,
      },
    };

    response.status(200).json({
      success: true,
      message: "Complaint analyzed successfully.",
      data: analysisWithDuplicate,
      analysis: analysisWithDuplicate,
      analyze: analysisWithDuplicate,
      duplicate,
      ...analysisWithDuplicate,
    });
  } catch (error) {
    next(error);
  }
}

export async function upvote(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await upvoteComplaintService(
      request.params.id,
      requireAuthenticatedUser(request).subjectId,
    );

    response.status(200).json({
      success: true,
      message: "Complaint upvoted.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeUpvote(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await removeComplaintUpvoteService(
      request.params.id,
      requireAuthenticatedUser(request).subjectId,
    );

    response.status(200).json({
      success: true,
      message: "Complaint upvote removed.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function follow(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await followComplaintService(
      request.params.id,
      requireAuthenticatedUser(request).subjectId,
    );

    response.status(200).json({
      success: true,
      message: "Complaint followed.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function unfollow(
  request: Request<{ id: string }>,
  response: Response<ComplaintResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await unfollowComplaintService(
      request.params.id,
      requireAuthenticatedUser(request).subjectId,
    );

    response.status(200).json({
      success: true,
      message: "Complaint unfollowed.",
      complaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function rate(
  request: Request<{ id: string }, unknown, { rating?: number; comment?: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body;
    const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
    const result = await rateComplaintService({
      complaintId: request.params.id,
      userId: requireAuthenticatedUser(request).subjectId,
      rating,
      comment: getString(body.comment),
    });

    response.status(200).json({
      success: true,
      message: "Complaint rated.",
      rating: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRate(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rating = await getComplaintRatingService(
      request.params.id,
      requireAuthenticatedUser(request).subjectId,
    );

    response.status(200).json({
      success: true,
      rating,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRatingSummary(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ratings = await getComplaintRatingSummaryService(request.params.id);

    response.status(200).json({
      success: true,
      ratings,
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
