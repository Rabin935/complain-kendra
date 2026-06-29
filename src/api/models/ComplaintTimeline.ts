import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import {
  TIMELINE_EVENT_TYPES,
  type ComplaintTimelineEvent,
  type TimelineEventType,
} from "../types";

type ComplaintTimelineModelShape = Omit<ComplaintTimelineEvent, "id" | "complaintId" | "actorId"> & {
  complaintId: Schema.Types.ObjectId | string;
  actorId?: Schema.Types.ObjectId | string;
};

export type ComplaintTimelineDocument = HydratedDocument<ComplaintTimelineModelShape>;
type ComplaintTimelineModel = Model<ComplaintTimelineModelShape>;

const complaintTimelineSchema = new Schema<
  ComplaintTimelineModelShape,
  ComplaintTimelineModel
>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TIMELINE_EVENT_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: undefined,
    },
    actorType: {
      type: String,
      enum: ["system", "citizen", "officer"],
      default: "system",
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

const ComplaintTimelineModel =
  (models.ComplaintTimeline as ComplaintTimelineModel | undefined) ??
  model<ComplaintTimelineModelShape, ComplaintTimelineModel>(
    "ComplaintTimeline",
    complaintTimelineSchema,
  );

export type CreateTimelineEventInput = {
  complaintId: string;
  type: TimelineEventType;
  title: string;
  message?: string;
  actorType?: "system" | "citizen" | "officer";
  actorId?: string;
  metadata?: Record<string, unknown>;
};

export default ComplaintTimelineModel;
