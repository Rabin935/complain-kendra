import { HydratedDocument, Model, Schema, Types, model, models } from "mongoose";

export interface ComplaintTimeline {
  complaintId: Types.ObjectId;
  type: string;
  title: string;
  message?: string;
  actorType: "system" | "citizen" | "officer";
  actorId?: Types.ObjectId;
  createdAt: Date;
}

export type ComplaintTimelineDocument = HydratedDocument<ComplaintTimeline>;

type ComplaintTimelineModel = Model<ComplaintTimeline>;

const complaintTimelineSchema = new Schema<ComplaintTimeline, ComplaintTimelineModel>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: undefined },
    actorType: {
      type: String,
      enum: ["system", "citizen", "officer"],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const ComplaintTimelineModel =
  (models.ComplaintTimeline as ComplaintTimelineModel | undefined) ??
  model<ComplaintTimeline, ComplaintTimelineModel>(
    "ComplaintTimeline",
    complaintTimelineSchema,
  );

export default ComplaintTimelineModel;
