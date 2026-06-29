import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import type { SubjectType } from "../types";

export interface RefreshToken {
  subjectId: Schema.Types.ObjectId | string;
  subjectType: SubjectType;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
type RefreshTokenModel = Model<RefreshToken>;

const refreshTokenSchema = new Schema<RefreshToken, RefreshTokenModel>(
  {
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    subjectType: {
      type: String,
      enum: ["citizen", "officer"],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: undefined },
    ipAddress: { type: String, trim: true, default: undefined },
    userAgent: { type: String, trim: true, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const RefreshTokenModel =
  (models.RefreshToken as RefreshTokenModel | undefined) ??
  model<RefreshToken, RefreshTokenModel>("RefreshToken", refreshTokenSchema);

export default RefreshTokenModel;
