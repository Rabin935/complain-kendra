import bcrypt from "bcryptjs";
import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import type { Officer } from "../types";

const SALT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export type OfficerDocument = HydratedDocument<Officer>;
type OfficerModel = Model<Officer>;

const officerSchema = new Schema<Officer, OfficerModel>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true, default: undefined },
    role: {
      type: String,
      enum: ["officer", "supervisor", "admin"],
      default: "officer",
      required: true,
    },
    ward: { type: String, trim: true, default: undefined, index: true },
    wardId: { type: String, trim: true, default: undefined, index: true },
    wardNumber: { type: String, trim: true, default: undefined },
    city: { type: String, trim: true, default: undefined },
    municipality: { type: String, trim: true, default: undefined },
    department: {
      type: String,
      default: "Ward Office",
      trim: true,
      required: true,
    },
    avatarUrl: { type: String, trim: true, default: undefined },
    notificationPreferences: {
      inApp: { type: Boolean, default: true, required: true },
      email: { type: Boolean, default: true, required: true },
      push: { type: Boolean, default: false, required: true },
      assignmentUpdates: { type: Boolean, default: true, required: true },
      urgentAlerts: { type: Boolean, default: true, required: true },
      dailyDigest: { type: Boolean, default: false, required: true },
    },
    isActive: { type: Boolean, default: true, required: true },
    lastLoginAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

officerSchema.pre("save", async function () {
  if (!this.isModified("password") || BCRYPT_HASH_PATTERN.test(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

const OfficerModel =
  (models.Officer as OfficerModel | undefined) ??
  model<Officer, OfficerModel>("Officer", officerSchema);

export default OfficerModel;
