import NotificationModel from "../models/Notification";
import NotificationPreferenceModel from "../models/NotificationPreference";
import { emitRealtimeEvent } from "../sockets/realtime";

interface CreateNotificationInput {
  userId: string;
  recipientType?: "citizen" | "officer";
  title: string;
  body: string;
  type:
    | "complaint_submitted"
    | "ai_analysis_completed"
    | "status_changed"
    | "officer_comment"
    | "complaint_resolved"
    | "badge_earned"
    | "complaint_followed"
    | "complaint_upvoted"
    | "warning";
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const recipientType = input.recipientType ?? "citizen";

  if (recipientType === "citizen") {
    const preference = await NotificationPreferenceModel.findOneAndUpdate(
      { userId: input.userId },
      { $setOnInsert: { userId: input.userId } },
      { new: true, upsert: true },
    );

    if (!preference.inApp) {
      return null;
    }
  }

  const notification = await NotificationModel.create({
    ...input,
    recipientType,
  });
  emitRealtimeEvent("notification:new", {
    userId: input.userId,
    recipientType,
    notification,
  });

  return notification;
}

export async function getOrCreateNotificationPreference(userId: string) {
  return NotificationPreferenceModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true },
  );
}
