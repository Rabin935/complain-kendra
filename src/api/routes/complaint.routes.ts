import { Router } from "express";
import multer from "multer";
import {
    analyze,
    create,
    delete as deleteComplaint,
    getAll,
    getById,
    getMy,
    timeline,
    update,
    updateStatus,
    uploadPhoto,
} from "../controllers/complaint.controller";
import { protect } from "../middlewares/auth.middleware";
import { AppError } from "../utils/appError";
import { isAllowedUploadMimeType } from "../utils/upload.utils";

const complaintRouter = Router();
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    if (!isAllowedUploadMimeType(file.mimetype)) {
      callback(new AppError("Only JPEG, PNG, and HEIC images are allowed.", 400));
      return;
    }

    callback(null, true);
  },
});

complaintRouter.use(protect);
complaintRouter.get("/", getAll);
complaintRouter.get("/my", getMy);
complaintRouter.post("/upload-photo", photoUpload.array("photo", 4), uploadPhoto);
complaintRouter.post("/analyze", analyze);
complaintRouter.post("/", create);
complaintRouter.get("/:id/timeline", timeline);
complaintRouter.patch("/:id/status", updateStatus);
complaintRouter.get("/:id", getById);
complaintRouter.put("/:id", update);
complaintRouter.delete("/:id", deleteComplaint);

export default complaintRouter;
