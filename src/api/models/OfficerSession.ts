import { HydratedDocument, Model, Schema, Types, model, models } from "mongoose";

export interface OfficerSession {
  officerId: Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
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
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: undefined,
    },
    userAgent: {
      type: String,
      default: undefined,
    },
    ipAddress: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const OfficerSessionModel =
  (models.OfficerSession as OfficerSessionModel | undefined) ??
  model<OfficerSession, OfficerSessionModel>("OfficerSession", officerSessionSchema);

export default OfficerSessionModel;
