import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface OfficerSession {
  officerId: Schema.Types.ObjectId | string;
  refreshTokenId: Schema.Types.ObjectId | string;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OfficerSessionDocument = HydratedDocument<OfficerSession>;
type OfficerSessionModel = Model<OfficerSession>;

const officerSessionSchema = new Schema<OfficerSession, OfficerSessionModel>(
  {
    officerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      required: true,
      index: true,
    },
    refreshTokenId: {
      type: Schema.Types.ObjectId,
      ref: "RefreshToken",
      required: true,
      index: true,
    },
    ipAddress: { type: String, trim: true, default: undefined },
    userAgent: { type: String, trim: true, default: undefined },
    lastSeenAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const OfficerSessionModel =
  (models.OfficerSession as OfficerSessionModel | undefined) ??
  model<OfficerSession, OfficerSessionModel>(
    "OfficerSession",
    officerSessionSchema,
  );

export default OfficerSessionModel;
