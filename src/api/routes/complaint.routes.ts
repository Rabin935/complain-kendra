import { Router } from "express";
import multer from "multer";
import {
  analyze,
  create,
  delete as deleteComplaint,
  follow,
  getAll,
  getById,
  getFollowed,
  getMy,
  getNearby,
  getRate,
  getRatingSummary,
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
    fileSize: 5 * 1024 * 1024,
    files: 4,
  },
  fileFilter(_request, file, callback) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

    if (!allowedTypes.has(file.mimetype)) {
      callback(new AppError("Only JPEG, PNG, and WebP images are allowed.", 400));
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
complaintRouter.post("/analyze", protect, complaintPhotoFields, analyze);
complaintRouter.get("/mine", protect, requireCitizen, getMy);
complaintRouter.get("/followed", protect, requireCitizen, getFollowed);
complaintRouter.post("/", protect, requireCitizen, complaintPhotoFields, create);
complaintRouter.post("/upload-photo", protect, requireCitizen, photoUpload.single("photo"), uploadPhoto);
complaintRouter.post("/photos", protect, requireCitizen, complaintPhotoFields, uploadPhotos);
complaintRouter.get("/:id/timeline", getTimeline);
complaintRouter.get("/:id/rate", protect, requireCitizen, getRate);
complaintRouter.get("/:id/ratings/summary", getRatingSummary);
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
