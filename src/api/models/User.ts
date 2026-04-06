import bcrypt from "bcryptjs";
import { HydratedDocument, Model, Schema, model, models } from "mongoose";
import type { User } from "../types";

const SALT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export type UserDocument = HydratedDocument<User>;

type UserModel = Model<User>;

const userSchema = new Schema<User, UserModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
      default: undefined,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || BCRYPT_HASH_PATTERN.test(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

const UserModel =
  (models.User as UserModel | undefined) ?? model<User, UserModel>("User", userSchema);

export default UserModel;
