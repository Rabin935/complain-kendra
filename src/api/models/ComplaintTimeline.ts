import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface ComplaintTimeline {
  complaintId: Schema.Types.ObjectId | string;
  type:
    | "submitted"
    | "ai_verified"
    | "status_changed"
    | "assigned"
    | "department_changed"
    | "priority_changed"
    | "comment_added"
    | "note_added"
    | "resolved"
    | "rejected"
    | "rated";
  title: string;
  message?: string;
  actorType: "system" | "citizen" | "officer";
  actorId?: Schema.Types.ObjectId | string;
  actorName?: string;
  isInternal: boolean;
  metadata?: Record<string, unknown>;
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
    type: {
      type: String,
      enum: [
        "submitted",
        "ai_verified",
        "status_changed",
        "assigned",
        "department_changed",
        "priority_changed",
        "comment_added",
        "note_added",
        "resolved",
        "rejected",
        "rated",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: undefined },
    actorType: {
      type: String,
      enum: ["system", "citizen", "officer"],
      default: "system",
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, default: undefined },
    actorName: { type: String, trim: true, default: undefined },
    isInternal: { type: Boolean, default: false, required: true },
    metadata: { type: Schema.Types.Mixed, default: undefined },
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
