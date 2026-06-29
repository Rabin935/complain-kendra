import { Router } from "express";
import multer from "multer";
import { uploadPhotos } from "../controllers/complaint.controller";
import { uploadAvatar } from "../controllers/user.controller";
import { protect, requireCitizen } from "../middlewares/auth.middleware";
import { AppError } from "../utils/appError";

const uploadRouter = Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 4,
  },
  fileFilter(_request, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new AppError("Only image files are allowed.", 400));
      return;
    }

    callback(null, true);
  },
});

uploadRouter.use(protect, requireCitizen);
uploadRouter.post(
  "/photos",
  imageUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "photos", maxCount: 4 },
    { name: "photos[]", maxCount: 4 },
  ]),
  uploadPhotos,
);
uploadRouter.post("/avatar", imageUpload.single("avatar"), uploadAvatar);

export default uploadRouter;
