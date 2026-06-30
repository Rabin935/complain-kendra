import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface Comment {
  complaintId: Schema.Types.ObjectId | string;
  parentId?: Schema.Types.ObjectId | string;
  authorType: "citizen" | "officer";
  authorId: Schema.Types.ObjectId | string;
  authorName: string;
  body: string;
  official: boolean;
  upvoteCount: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = HydratedDocument<Comment>;
type CommentModel = Model<Comment>;

const commentSchema = new Schema<Comment, CommentModel>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: undefined,
      index: true,
    },
    authorType: {
      type: String,
      enum: ["citizen", "officer"],
      required: true,
      index: true,
    },
    authorId: { type: Schema.Types.ObjectId, required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    official: { type: Boolean, default: false, required: true },
    upvoteCount: { type: Number, default: 0, min: 0, required: true },
    deletedAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const CommentModel =
  (models.Comment as CommentModel | undefined) ??
  model<Comment, CommentModel>("Comment", commentSchema);

export default CommentModel;
