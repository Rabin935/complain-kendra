import CommentModel, { type CommentDocument } from "../models/Comment";
import CommentUpvoteModel from "../models/CommentUpvote";
import FollowModel from "../models/Follow";
import OfficerModel from "../models/Officer";
import UserModel from "../models/User";
import { AppError } from "../utils/appError";
import { requireObjectId, requireString } from "../utils/request.utils";
import {
  addTimeline,
  decrementCommentCount,
  getComplaintOwner,
  incrementCommentCount,
} from "./complaint.service";
import { createNotification } from "./notification.service";
import { awardPoints } from "./points.service";
import { emitRealtimeEvent } from "../sockets/realtime";
import type { JwtUserPayload } from "../types";

type CommentPayload = {
  id: string;
  complaintId: string;
  parentId?: string;
  authorType: "citizen" | "officer";
  authorId: string;
  authorName: string;
  body: string;
  official: boolean;
  upvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
  replies: CommentPayload[];
};

function toCommentPayload(comment: CommentDocument): CommentPayload {
  return {
    id: comment._id.toString(),
    complaintId: comment.complaintId.toString(),
    parentId: comment.parentId?.toString(),
    authorType: comment.authorType,
    authorId: comment.authorId.toString(),
    authorName: comment.authorName,
    body: comment.body,
    official: comment.official,
    upvoteCount: comment.upvoteCount,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    replies: [],
  };
}

function buildThreadedComments(comments: CommentDocument[]) {
  const byId = new Map<string, CommentPayload>();
  const roots: CommentPayload[] = [];

  for (const comment of comments) {
    byId.set(comment._id.toString(), toCommentPayload(comment));
  }

  for (const comment of comments) {
    const payload = byId.get(comment._id.toString());

    if (!payload) {
      continue;
    }

    const parentId = comment.parentId?.toString();
    const parent = parentId ? byId.get(parentId) : undefined;

    if (parent) {
      parent.replies.push(payload);
    } else {
      roots.push(payload);
    }
  }

  return roots;
}

export async function listComments(complaintId: string) {
  const normalizedComplaintId = requireObjectId(complaintId, "complaint id");
  await getComplaintOwner(normalizedComplaintId);

  const comments = await CommentModel.find({
    complaintId: normalizedComplaintId,
    deletedAt: undefined,
  }).sort({ createdAt: 1 });

  return buildThreadedComments(comments);
}

async function getActorName(actor: JwtUserPayload): Promise<string> {
  if (actor.type === "officer") {
    const officer = await OfficerModel.findById(actor.subjectId);
    return officer?.name ?? "Ward officer";
  }

  const user = await UserModel.findById(actor.subjectId);
  return user?.name ?? "Citizen";
}

export async function createComment(input: {
  complaintId: string;
  actor: JwtUserPayload;
  body: string;
  parentId?: string;
  official?: boolean;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const { complaint, userId: ownerId } = await getComplaintOwner(complaintId);
  const parentId = input.parentId ? requireObjectId(input.parentId, "parent comment id") : undefined;

  if (parentId) {
    const parent = await CommentModel.findOne({
      _id: parentId,
      complaintId,
      deletedAt: undefined,
    });

    if (!parent) {
      throw new AppError("Parent comment not found.", 404);
    }
  }

  const official = input.actor.type === "officer" && Boolean(input.official);
  const comment = await CommentModel.create({
    complaintId,
    parentId,
    authorType: input.actor.type,
    authorId: input.actor.subjectId,
    authorName: await getActorName(input.actor),
    body: requireString(input.body, "Comment"),
    official,
  });

  await incrementCommentCount(complaintId);
  await addTimeline({
    complaintId,
    type: "comment_added",
    title: official ? "Official response added" : "Comment added",
    message: official ? "Ward officer posted an official response." : "A public comment was added.",
    actorType: input.actor.type,
    actorId: input.actor.subjectId,
    actorName: comment.authorName,
  });

  if (input.actor.type === "citizen") {
    await awardPoints({
      userId: input.actor.subjectId,
      complaintId,
      type: "comment",
      reason: "Comment on complaint",
    });
  }

  if (official || input.actor.subjectId !== ownerId) {
    await createNotification({
      userId: ownerId,
      type: official ? "officer_comment" : "status_changed",
      title: official ? "Official response added" : "New comment",
      body: `${complaint.complaintNo} has a new ${official ? "official response" : "comment"}.`,
      data: { complaintId, complaintNo: complaint.complaintNo, commentId: comment._id.toString() },
    });
  }

  const followers = await FollowModel.find({
    complaintId,
    userId: { $nin: [input.actor.subjectId, ownerId] },
  }).select("userId");

  await Promise.all(
    followers.map((follow) =>
      createNotification({
        userId: follow.userId.toString(),
        type: official ? "officer_comment" : "status_changed",
        title: official ? "Official response added" : "New comment",
        body: `${complaint.complaintNo} has a new ${official ? "official response" : "comment"}.`,
        data: { complaintId, complaintNo: complaint.complaintNo, commentId: comment._id.toString() },
      }),
    ),
  );

  emitRealtimeEvent("complaint:new_comment", {
    complaintId,
    commentId: comment._id.toString(),
    official,
  });

  return comment;
}

export async function updateComment(input: {
  complaintId: string;
  commentId: string;
  actor: JwtUserPayload;
  body: string;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const commentId = requireObjectId(input.commentId, "comment id");
  const comment = await CommentModel.findOne({
    _id: commentId,
    complaintId,
    deletedAt: undefined,
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  if (comment.authorId.toString() !== input.actor.subjectId) {
    throw new AppError("You can only edit your own comment.", 403);
  }

  comment.body = requireString(input.body, "Comment");
  await comment.save();

  return comment;
}

export async function upvoteComment(input: {
  complaintId: string;
  commentId: string;
  userId: string;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const commentId = requireObjectId(input.commentId, "comment id");
  const userId = requireObjectId(input.userId, "user id");
  const comment = await CommentModel.findOne({
    _id: commentId,
    complaintId,
    deletedAt: undefined,
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  const created = await CommentUpvoteModel.updateOne(
    { commentId, userId },
    { $setOnInsert: { commentId, userId } },
    { upsert: true },
  );

  if (created.upsertedCount > 0) {
    comment.upvoteCount += 1;
    await comment.save();
  }

  return comment;
}

export async function deleteComment(input: {
  complaintId: string;
  commentId: string;
  actor: JwtUserPayload;
}) {
  const complaintId = requireObjectId(input.complaintId, "complaint id");
  const commentId = requireObjectId(input.commentId, "comment id");
  const comment = await CommentModel.findOne({
    _id: commentId,
    complaintId,
    deletedAt: undefined,
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  const isOwner = comment.authorId.toString() === input.actor.subjectId;
  const isAdmin = input.actor.role === "admin" || input.actor.role === "supervisor";

  if (!isOwner && !isAdmin) {
    throw new AppError("You can only delete your own comment.", 403);
  }

  comment.deletedAt = new Date();
  await comment.save();
  await decrementCommentCount(complaintId);

  return comment;
}
