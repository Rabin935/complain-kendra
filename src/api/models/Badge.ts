import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Badge {
  code: string;
  title: string;
  description: string;
  pointsRequired: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BadgeDocument = HydratedDocument<Badge>;

type BadgeModel = Model<Badge>;

const badgeSchema = new Schema<Badge, BadgeModel>(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pointsRequired: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const BadgeModel =
  (models.Badge as BadgeModel | undefined) ??
  model<Badge, BadgeModel>("Badge", badgeSchema);

export default BadgeModel;
