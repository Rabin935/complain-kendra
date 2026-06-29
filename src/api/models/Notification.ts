import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Notification {
  userId: Schema.Types.ObjectId | string;
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
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
type NotificationModel = Model<Notification>;

const notificationSchema = new Schema<Notification, NotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "complaint_submitted",
        "ai_analysis_completed",
        "status_changed",
        "officer_comment",
        "complaint_resolved",
        "badge_earned",
        "complaint_followed",
        "complaint_upvoted",
        "warning",
      ],
      required: true,
      index: true,
    },
    data: { type: Schema.Types.Mixed, default: undefined },
    readAt: { type: Date, default: undefined, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NotificationModel =
  (models.Notification as NotificationModel | undefined) ??
  model<Notification, NotificationModel>("Notification", notificationSchema);

export default NotificationModel;
