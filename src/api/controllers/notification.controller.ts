import type { NextFunction, Request, Response } from "express";
import NotificationModel from "../models/Notification";
import NotificationPreferenceModel from "../models/NotificationPreference";
import { getOrCreateNotificationPreference } from "../services/notification.service";
import { AppError } from "../utils/appError";
import { getString, requireObjectId } from "../utils/request.utils";

function requireCitizenId(request: Request): string {
  if (!request.user || request.user.type !== "citizen") {
    throw new AppError("Citizen authentication is required.", 401);
  }

  return request.user.subjectId;
}

export async function listNotifications(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireCitizenId(request);
    const notifications = await NotificationModel.find({ userId, recipientType: "citizen" })
      .sort({ createdAt: -1 })
      .limit(50);

    response.status(200).json({
      success: true,
      notifications: notifications.map((notification) => ({
        id: notification._id.toString(),
        title: notification.title,
        body: notification.body,
        type: notification.type,
        recipientType: notification.recipientType,
        data: notification.data,
        unread: !notification.readAt,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function markRead(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireCitizenId(request);
    const id = requireObjectId(request.params.id, "notification id");
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId, recipientType: "citizen" },
      { $set: { readAt: new Date() } },
      { new: true },
    );

    if (!notification) {
      throw new AppError("Notification not found.", 404);
    }

    response.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    next(error);
  }
}

export async function readAll(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = requireCitizenId(request);
    await NotificationModel.updateMany(
      { userId, recipientType: "citizen", readAt: undefined },
      { $set: { readAt: new Date() } },
    );

    response.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    next(error);
  }
}

export async function preferences(request: Request, response: Response, next: NextFunction) {
  try {
    const preference = await getOrCreateNotificationPreference(requireCitizenId(request));

    response.status(200).json({
      success: true,
      preferences: preference,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const userId = requireCitizenId(request);
    const allowed = [
      "inApp",
      "email",
      "push",
      "sms",
      "complaintUpdates",
      "comments",
      "badges",
    ];
    const updates: Record<string, boolean> = {};
    const body = request.body as Record<string, unknown>;

    for (const key of allowed) {
      if (typeof body[key] === "boolean") {
        updates[key] = body[key];
      }
    }

    const preference = await NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      { $set: updates, $setOnInsert: { userId } },
      { new: true, upsert: true },
    );

    response.status(200).json({
      success: true,
      message: "Notification preferences updated.",
      preferences: preference,
    });
  } catch (error) {
    next(error);
  }
}

export async function deviceToken(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = requireCitizenId(request);
    const token = getString((request.body as { token?: unknown }).token);

    if (!token) {
      throw new AppError("Device token is required.", 400);
    }

    const preference = await NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },
        $addToSet: { deviceTokens: token },
      },
      { new: true, upsert: true },
    );

    response.status(200).json({
      success: true,
      message: "Device token registered.",
      preferences: preference,
    });
  } catch (error) {
    next(error);
  }
}
