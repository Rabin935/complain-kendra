import { Router } from "express";
import multer from "multer";
import {
  badges,
  language,
  me,
  password,
  publicProfile,
  stats,
  updateMe,
  uploadAvatar,
} from "../controllers/user.controller";
import { protect, requireCitizen } from "../middlewares/auth.middleware";
import { AppError } from "../utils/appError";

const userRouter = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new AppError("Only image files are allowed.", 400));
      return;
    }

    callback(null, true);
  },
});

userRouter.get("/me", protect, requireCitizen, me);
userRouter.patch("/me", protect, requireCitizen, updateMe);
userRouter.post("/me/avatar", protect, requireCitizen, avatarUpload.single("avatar"), uploadAvatar);
userRouter.patch("/me/password", protect, requireCitizen, password);
userRouter.patch("/me/language", protect, requireCitizen, language);
userRouter.get("/me/stats", protect, requireCitizen, stats);
userRouter.get("/me/badges", protect, requireCitizen, badges);
userRouter.get("/:id", publicProfile);

export default userRouter;
