import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Ward {
  wardNumber: string;
  name: string;
  city: string;
  area?: string;
  contactEmail?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WardDocument = HydratedDocument<Ward>;
type WardModel = Model<Ward>;

const wardSchema = new Schema<Ward, WardModel>(
  {
    wardNumber: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: undefined },
    contactEmail: { type: String, trim: true, default: undefined },
    contactPhone: { type: String, trim: true, default: undefined },
    lat: { type: Number, default: undefined },
    lng: { type: Number, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const WardModel =
  (models.Ward as WardModel | undefined) ?? model<Ward, WardModel>("Ward", wardSchema);

export default WardModel;
