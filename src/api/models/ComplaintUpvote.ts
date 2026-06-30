import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface ComplaintUpvote {
  complaintId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  createdAt: Date;
}

export type ComplaintUpvoteDocument = HydratedDocument<ComplaintUpvote>;
type ComplaintUpvoteModel = Model<ComplaintUpvote>;

const complaintUpvoteSchema = new Schema<ComplaintUpvote, ComplaintUpvoteModel>(
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

complaintUpvoteSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

const ComplaintUpvoteModel =
  (models.ComplaintUpvote as ComplaintUpvoteModel | undefined) ??
  model<ComplaintUpvote, ComplaintUpvoteModel>(
    "ComplaintUpvote",
    complaintUpvoteSchema,
  );

export default ComplaintUpvoteModel;
