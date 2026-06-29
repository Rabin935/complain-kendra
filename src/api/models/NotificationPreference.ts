import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface NotificationPreference {
  userId: Schema.Types.ObjectId | string;
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  complaintUpdates: boolean;
  comments: boolean;
  badges: boolean;
  deviceTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationPreferenceDocument = HydratedDocument<NotificationPreference>;
type NotificationPreferenceModel = Model<NotificationPreference>;

const notificationPreferenceSchema = new Schema<
  NotificationPreference,
  NotificationPreferenceModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    inApp: { type: Boolean, default: true, required: true },
    email: { type: Boolean, default: true, required: true },
    push: { type: Boolean, default: false, required: true },
    sms: { type: Boolean, default: false, required: true },
    complaintUpdates: { type: Boolean, default: true, required: true },
    comments: { type: Boolean, default: true, required: true },
    badges: { type: Boolean, default: true, required: true },
    deviceTokens: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NotificationPreferenceModel =
  (models.NotificationPreference as NotificationPreferenceModel | undefined) ??
  model<NotificationPreference, NotificationPreferenceModel>(
    "NotificationPreference",
    notificationPreferenceSchema,
  );

export default NotificationPreferenceModel;
