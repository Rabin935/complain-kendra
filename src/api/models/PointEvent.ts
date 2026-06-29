import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface PointEvent {
  userId: Schema.Types.ObjectId | string;
  complaintId?: Schema.Types.ObjectId | string;
  type:
    | "submit_verified_complaint"
    | "complaint_resolved"
    | "receive_upvote"
    | "comment"
    | "rate_resolved_complaint"
    | "manual_adjustment";
  points: number;
  reason: string;
  createdAt: Date;
}

export type PointEventDocument = HydratedDocument<PointEvent>;
type PointEventModel = Model<PointEvent>;

const pointEventSchema = new Schema<PointEvent, PointEventModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      default: undefined,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "submit_verified_complaint",
        "complaint_resolved",
        "receive_upvote",
        "comment",
        "rate_resolved_complaint",
        "manual_adjustment",
      ],
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const PointEventModel =
  (models.PointEvent as PointEventModel | undefined) ??
  model<PointEvent, PointEventModel>("PointEvent", pointEventSchema);

export default PointEventModel;
