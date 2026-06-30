import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface UserBadge {
  userId: Schema.Types.ObjectId | string;
  badgeId: Schema.Types.ObjectId | string;
  earnedAt: Date;
}

export type UserBadgeDocument = HydratedDocument<UserBadge>;
type UserBadgeModel = Model<UserBadge>;

const userBadgeSchema = new Schema<UserBadge, UserBadgeModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeId: {
      type: Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
      index: true,
    },
    earnedAt: { type: Date, default: Date.now, required: true },
  },
  {
    versionKey: false,
  },
);

userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

const UserBadgeModel =
  (models.UserBadge as UserBadgeModel | undefined) ??
  model<UserBadge, UserBadgeModel>("UserBadge", userBadgeSchema);

export default UserBadgeModel;
