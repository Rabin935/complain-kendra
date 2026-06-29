import { HydratedDocument, Model, Schema, Types, model, models } from "mongoose";

export type ComplaintStatus = "pending" | "in_progress" | "resolved" | "rejected";
export type ComplaintPriority = "low" | "medium" | "high" | "critical";

export interface Complaint {
  userId: Types.ObjectId;
  complaintNo: string;
  title: string;
  description: string;
  category: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location: {
    ward: string;
    wardId?: string;
    area?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  photos: string[];
  assignedOfficerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplaintDocument = HydratedDocument<Complaint>;

type ComplaintModel = Model<Complaint>;

const complaintSchema = new Schema<Complaint, ComplaintModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    complaintNo: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "rejected"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    location: {
      ward: { type: String, required: true, trim: true },
      wardId: { type: String, trim: true, default: undefined },
      area: { type: String, trim: true, default: undefined },
      city: { type: String, trim: true, default: undefined },
      address: { type: String, trim: true, default: undefined },
      lat: { type: Number, default: undefined },
      lng: { type: Number, default: undefined },
    },
    photos: { type: [String], default: [] },
    assignedOfficerId: { type: Schema.Types.ObjectId, ref: "Officer", default: undefined },
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
