import { Router } from "express";
import {
  me,
  patchLanguage,
  patchMe,
  patchPassword,
} from "../controllers/user.controller";
import { protect } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.use(protect);
userRouter.get("/me", me);
userRouter.patch("/me", patchMe);
userRouter.patch("/me/password", patchPassword);
userRouter.patch("/me/language", patchLanguage);

export default userRouter;
