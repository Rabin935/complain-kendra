import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface ComplaintCounter {
  key: string;
  sequence: number;
}

export type ComplaintCounterDocument = HydratedDocument<ComplaintCounter>;
type ComplaintCounterModel = Model<ComplaintCounter>;

const complaintCounterSchema = new Schema<ComplaintCounter, ComplaintCounterModel>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  },
);

const ComplaintCounterModel =
  (models.ComplaintCounter as ComplaintCounterModel | undefined) ??
  model<ComplaintCounter, ComplaintCounterModel>(
    "ComplaintCounter",
    complaintCounterSchema,
  );

export default ComplaintCounterModel;
