import { Router } from "express";
import {
  getComments,
  postComment,
  removeComment,
  upvote,
} from "../controllers/comment.controller";
import { protect } from "../middlewares/auth.middleware";

const commentRouter = Router({ mergeParams: true });

commentRouter.get("/complaints/:complaint_id/comments", getComments);
commentRouter.post("/complaints/:complaint_id/comments", protect, postComment);
commentRouter.post(
  "/complaints/:complaint_id/comments/:comment_id/upvote",
  protect,
  upvote,
);
commentRouter.delete(
  "/complaints/:complaint_id/comments/:comment_id",
  protect,
  removeComment,
);

export default commentRouter;
