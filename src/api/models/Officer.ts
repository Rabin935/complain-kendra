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
    },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true, default: undefined },
    role: {
      type: String,
      enum: ["officer", "supervisor", "admin"],
      default: "officer",
      required: true,
    },
    ward: { type: String, trim: true, default: undefined },
    department: { type: String, trim: true, default: undefined },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  {
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
