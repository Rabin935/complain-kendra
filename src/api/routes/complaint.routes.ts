import { Router } from "express";
import multer from "multer";
import {
    analyze,
    create,
    delete as deleteComplaint,
    getAll,
    getById,
    getMy,
    update,
    uploadPhoto,
} from "../controllers/complaint.controller";
import { protect } from "../middlewares/auth.middleware";
import { AppError } from "../utils/appError";

const complaintRouter = Router();
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter(_request, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new AppError("Only image files are allowed.", 400));
      return;
    }

    callback(null, true);
  },
});

complaintRouter.use(protect);
complaintRouter.get("/", getAll);
complaintRouter.get("/my", getMy);
complaintRouter.post("/upload-photo", photoUpload.single("photo"), uploadPhoto);
complaintRouter.post("/analyze", analyze);
complaintRouter.post("/", create);
complaintRouter.get("/:id", getById);
complaintRouter.put("/:id", update);
complaintRouter.delete("/:id", deleteComplaint);

export default complaintRouter;
