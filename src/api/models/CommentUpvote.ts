import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface CommentUpvote {
  commentId: Schema.Types.ObjectId | string;
  userId: Schema.Types.ObjectId | string;
  createdAt: Date;
}

export type CommentUpvoteDocument = HydratedDocument<CommentUpvote>;
type CommentUpvoteModel = Model<CommentUpvote>;

const commentUpvoteSchema = new Schema<CommentUpvote, CommentUpvoteModel>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
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

commentUpvoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

const CommentUpvoteModel =
  (models.CommentUpvote as CommentUpvoteModel | undefined) ??
  model<CommentUpvote, CommentUpvoteModel>("CommentUpvote", commentUpvoteSchema);

export default CommentUpvoteModel;
