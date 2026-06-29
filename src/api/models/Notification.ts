import { HydratedDocument, Model, Schema, Types, model, models } from "mongoose";

export interface Notification {
  userId: Types.ObjectId;
  title: string;
  body: string;
  type: string;
  readAt?: Date;
  createdAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

type NotificationModel = Model<Notification>;

const notificationSchema = new Schema<Notification, NotificationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    readAt: { type: Date, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const NotificationModel =
  (models.Notification as NotificationModel | undefined) ??
  model<Notification, NotificationModel>("Notification", notificationSchema);

export default NotificationModel;
