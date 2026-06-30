import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type Complaint,
  type ComplaintAiAnalysis,
  type ComplaintLocation,
} from "../types";

export type ComplaintDocument = HydratedDocument<Complaint>;
type ComplaintModel = Model<Complaint>;

const complaintLocationSchema = new Schema<ComplaintLocation>(
  {
    lat: { type: Number, default: undefined },
    lng: { type: Number, default: undefined },
    address: { type: String, trim: true, default: undefined },
    area: { type: String, trim: true, default: undefined },
    ward: { type: String, trim: true, default: undefined },
    wardId: { type: String, trim: true, default: undefined },
    wardName: { type: String, trim: true, default: undefined },
    wardNumber: { type: String, trim: true, default: undefined },
    city: { type: String, trim: true, default: undefined },
    municipality: { type: String, trim: true, default: undefined },
    province: { type: String, trim: true, default: undefined },
  },
  { _id: false },
);

const aiAnalysisSchema = new Schema<ComplaintAiAnalysis>(
  {
    // These snake-case fields make the persisted document match the complaint_ai contract.
    detected_category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      default: undefined,
    },
    confidence_score: { type: Number, min: 0, max: 100, default: undefined },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: undefined,
    },
    estimated_resolution_days: { type: Number, min: 1, default: undefined },
    duplicate_probability: { type: Number, min: 0, max: 1, default: undefined },
    // Existing camel-case fields remain for backward compatibility with the app UI.
    detectedCategory: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
    },
    confidence: { type: Number, min: 0, max: 100, required: true },
    severityLabel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    sizeEstimate: { type: String, trim: true, default: undefined },
    priority: { type: String, enum: COMPLAINT_PRIORITIES, required: true },
    department: { type: String, trim: true, required: true },
    etaDays: { type: Number, min: 1, required: true },
    duplicateCheck: {
      isDuplicate: { type: Boolean, default: false, required: true },
      complaintId: { type: String, trim: true, default: undefined },
      complaintNo: { type: String, trim: true, default: undefined },
      title: { type: String, trim: true, default: undefined },
      distanceMeters: { type: Number, default: undefined },
      probability: { type: Number, min: 0, max: 1, default: undefined },
    },
    verified: { type: Boolean, default: true, required: true },
    summary: { type: String, trim: true, required: true },
    keywords: { type: [String], default: [] },
    analyzedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const complaintSchema = new Schema<Complaint, ComplaintModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    complaintNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: complaintLocationSchema, default: undefined },
    photos: { type: [String], default: [] },
    photo: { type: String, trim: true, default: undefined },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: "medium",
      required: true,
      index: true,
    },
    // Priority engine output is stored separately from the active priority for auditability.
    calculatedPriority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: undefined,
      index: true,
    },
    priorityScore: { type: Number, min: 0, max: 12, default: undefined },
    priorityReasons: { type: [String], default: [] },
    priorityOverriddenBy: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      default: undefined,
    },
    priorityOverriddenAt: { type: Date, default: undefined },
    priorityOverrideReason: { type: String, trim: true, default: undefined },
    duplicateOfComplaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      default: undefined,
    },
    duplicateSimilarityScore: { type: Number, min: 0, max: 1, default: undefined },
    duplicateCheckedAt: { type: Date, default: undefined },
    aiAnalysis: { type: aiAnalysisSchema, default: undefined },
    aiVerified: { type: Boolean, default: false, required: true },
    aiSuggestedCategory: { type: String, trim: true, default: undefined },
    aiSeverity: { type: Number, min: 1, max: 10, default: undefined },
    aiSummary: { type: String, trim: true, default: undefined },
    aiKeywords: { type: [String], default: [] },
    embedding: { type: [Number], default: [] },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      default: undefined,
    },
    assignedOfficerName: { type: String, trim: true, default: undefined },
    // Department routing is stored on the complaint so officer queues can filter it directly.
    assignedDepartment: { type: String, trim: true, default: undefined, index: true },
    departmentOverriddenBy: {
      type: Schema.Types.ObjectId,
      ref: "Officer",
      default: undefined,
    },
    departmentOverriddenAt: { type: Date, default: undefined },
    departmentOverrideReason: { type: String, trim: true, default: undefined },
    rejectionReason: { type: String, trim: true, default: undefined },
    resolutionNote: { type: String, trim: true, default: undefined },
    upvoteCount: { type: Number, default: 0, min: 0, required: true },
    commentCount: { type: Number, default: 0, min: 0, required: true },
    followerCount: { type: Number, default: 0, min: 0, required: true },
    ratingAverage: { type: Number, min: 1, max: 5, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

complaintSchema.index({ "location.ward": 1, status: 1, priority: 1 });
complaintSchema.index({ "location.wardId": 1, status: 1 });
complaintSchema.index({ title: "text", description: "text" });

const ComplaintModel =
  (models.Complaint as ComplaintModel | undefined) ??
  model<Complaint, ComplaintModel>("Complaint", complaintSchema);

export default ComplaintModel;
