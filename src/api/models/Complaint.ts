import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type Complaint,
  type ComplaintLocation,
} from "../types";

export type ComplaintDocument = HydratedDocument<Complaint>;

type ComplaintModel = Model<Complaint>;

const complaintLocationSchema = new Schema<ComplaintLocation>(
  {
    lat: {
      type: Number,
      default: undefined,
    },
    lng: {
      type: Number,
      default: undefined,
    },
    address: {
      type: String,
      trim: true,
      default: undefined,
    },
    ward: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const complaintSchema = new Schema<Complaint, ComplaintModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: complaintLocationSchema,
      default: undefined,
    },
    photo: {
      type: String,
      trim: true,
      default: undefined,
    },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "Pending",
      required: true,
    },
    aiSuggestedCategory: {
      type: String,
      trim: true,
      default: undefined,
    },
    aiSeverity: {
      type: Number,
      min: 1,
      max: 10,
      default: undefined,
    },
    aiSummary: {
      type: String,
      trim: true,
      default: undefined,
    },
    aiKeywords: {
      type: [String],
      default: [],
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const ComplaintModel =
  (models.Complaint as ComplaintModel | undefined) ??
  model<Complaint, ComplaintModel>("Complaint", complaintSchema);

export default ComplaintModel;
