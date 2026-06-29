import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Category {
  code: string;
  label: string;
  description?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;

type CategoryModel = Model<Category>;

const categorySchema = new Schema<Category, CategoryModel>(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: undefined },
    department: { type: String, trim: true, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const CategoryModel =
  (models.Category as CategoryModel | undefined) ??
  model<Category, CategoryModel>("Category", categorySchema);

export default CategoryModel;
