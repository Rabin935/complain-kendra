import { Router } from "express";
import multer from "multer";
import {
  analyze,
  create,
  delete as deleteComplaint,
  follow,
  getAll,
  getById,
  getMy,
  getNearby,
  getRate,
  getTimeline,
  rate,
  removeUpvote,
  unfollow,
  update,
  uploadPhoto,
  uploadPhotos,
  upvote,
} from "../controllers/complaint.controller";
import { protect, requireCitizen } from "../middlewares/auth.middleware";
import { AppError } from "../utils/appError";

const complaintRouter = Router();
const photoUpload = multer({
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

const complaintPhotoFields = photoUpload.fields([
  { name: "photo", maxCount: 1 },
  { name: "photos", maxCount: 4 },
  { name: "photos[]", maxCount: 4 },
]);

complaintRouter.get("/", getAll);
complaintRouter.get("/nearby", getNearby);
complaintRouter.post("/analyze", protect, analyze);
complaintRouter.get("/mine", protect, requireCitizen, getMy);
complaintRouter.post("/", protect, requireCitizen, complaintPhotoFields, create);
complaintRouter.post("/upload-photo", protect, requireCitizen, photoUpload.single("photo"), uploadPhoto);
complaintRouter.post("/photos", protect, requireCitizen, complaintPhotoFields, uploadPhotos);
complaintRouter.get("/:id/timeline", getTimeline);
complaintRouter.get("/:id/rate", protect, requireCitizen, getRate);
complaintRouter.post("/:id/rate", protect, requireCitizen, rate);
complaintRouter.post("/:id/upvote", protect, requireCitizen, upvote);
complaintRouter.delete("/:id/upvote", protect, requireCitizen, removeUpvote);
complaintRouter.post("/:id/follow", protect, requireCitizen, follow);
complaintRouter.delete("/:id/follow", protect, requireCitizen, unfollow);
complaintRouter.get("/:id", getById);
complaintRouter.put("/:id", protect, requireCitizen, update);
complaintRouter.patch("/:id", protect, requireCitizen, update);
complaintRouter.delete("/:id", protect, requireCitizen, deleteComplaint);

export default complaintRouter;
