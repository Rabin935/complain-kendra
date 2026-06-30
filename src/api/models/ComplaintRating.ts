import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface ComplaintRating {
  complaintId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplaintRatingDocument = HydratedDocument<ComplaintRating>;
type ComplaintRatingModel = Model<ComplaintRating>;

const complaintRatingSchema = new Schema<ComplaintRating, ComplaintRatingModel>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

complaintRatingSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

const ComplaintRatingModel =
  (models.ComplaintRating as ComplaintRatingModel | undefined) ??
  model<ComplaintRating, ComplaintRatingModel>(
    "ComplaintRating",
    complaintRatingSchema,
  );

export default ComplaintRatingModel;
