import bcrypt from "bcryptjs";
import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import type { User, WardLocation } from "../types";

const SALT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export type UserDocument = HydratedDocument<User>;
type UserModel = Model<User>;

const locationSchema = new Schema<WardLocation>(
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

const userSchema = new Schema<User, UserModel>(
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
      enum: ["citizen", "admin"],
      default: "citizen",
      required: true,
    },
    ward: { type: String, trim: true, default: undefined },
    wardId: { type: String, trim: true, default: undefined, index: true },
    homeArea: { type: String, trim: true, default: undefined },
    bio: { type: String, trim: true, maxlength: 250, default: undefined },
    address: { type: String, trim: true, default: undefined },
    city: { type: String, trim: true, default: undefined },
    municipality: { type: String, trim: true, default: undefined },
    location: { type: locationSchema, default: undefined },
    language: {
      type: String,
      enum: ["English", "Nepali"],
      default: "English",
      required: true,
    },
    isPublic: { type: Boolean, default: true, required: true },
    isBanned: { type: Boolean, default: false, required: true },
    banReason: { type: String, trim: true, default: undefined },
    points: { type: Number, default: 0, min: 0, required: true },
    level: { type: Number, default: 1, min: 1, required: true },
    levelTitle: {
      type: String,
      default: "Community Starter",
      trim: true,
      required: true,
    },
    googleId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
    isGoogleUser: { type: Boolean, default: false, required: true },
    avatarUrl: { type: String, trim: true, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ isBanned: 1, createdAt: -1 });
userSchema.index({ ward: 1, isBanned: 1, createdAt: -1 });
userSchema.index({ points: -1, level: -1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password") || BCRYPT_HASH_PATTERN.test(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

const UserModel =
  (models.User as UserModel | undefined) ?? model<User, UserModel>("User", userSchema);

export default UserModel;
