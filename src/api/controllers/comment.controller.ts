import type { NextFunction, Request, Response } from "express";
import {
  createComment,
  deleteComment,
  listComments,
  upvoteComment,
} from "../services/comment.service";
import { AppError } from "../utils/appError";
import { getString } from "../utils/request.utils";

function requireUser(request: Request) {
  if (!request.user) {
    throw new AppError("Authentication is required.", 401);
  }

  return request.user;
}

export async function getComments(
  request: Request<{ complaint_id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comments = await listComments(request.params.complaint_id);

    response.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    next(error);
  }
}

export async function postComment(
  request: Request<{ complaint_id: string }, unknown, { body?: string; parent_id?: string; parentId?: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comment = await createComment({
      complaintId: request.params.complaint_id,
      actor: requireUser(request),
      body: getString(request.body.body) ?? "",
      parentId: getString(request.body.parent_id ?? request.body.parentId),
      official: request.user?.type === "officer",
    });

    response.status(201).json({
      success: true,
      message: "Comment added.",
      comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function upvote(
  request: Request<{ complaint_id: string; comment_id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const comment = await upvoteComment({
      complaintId: request.params.complaint_id,
      commentId: request.params.comment_id,
      userId: requireUser(request).subjectId,
    });

    response.status(200).json({
      success: true,
      message: "Comment upvoted.",
      comment,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeComment(
  request: Request<{ complaint_id: string; comment_id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteComment({
      complaintId: request.params.complaint_id,
      commentId: request.params.comment_id,
      actor: requireUser(request),
    });

    response.status(200).json({
      success: true,
      message: "Comment deleted.",
    });
  } catch (error) {
    next(error);
  }
}
