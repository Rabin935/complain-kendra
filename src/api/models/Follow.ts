import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Follow {
  complaintId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  createdAt: Date;
}

export type FollowDocument = HydratedDocument<Follow>;
type FollowModel = Model<Follow>;

const followSchema = new Schema<Follow, FollowModel>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

followSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

const FollowModel =
  (models.Follow as FollowModel | undefined) ?? model<Follow, FollowModel>("Follow", followSchema);

export default FollowModel;
