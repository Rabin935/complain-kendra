import { HydratedDocument, Model, Schema, Types, model, models } from "mongoose";

export interface RefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

type RefreshTokenModel = Model<RefreshToken>;

const refreshTokenSchema = new Schema<RefreshToken, RefreshTokenModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
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
    replacedByTokenHash: {
      type: String,
      default: undefined,
    },
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
