import { Router } from "express";
import {
  create,
  delete as deleteComplaint,
  getAll,
  getById,
  getMy,
  update,
} from "../controllers/complaint.controller";
import { protect } from "../middlewares/auth.middleware";

const complaintRouter = Router();

complaintRouter.use(protect);
complaintRouter.get("/", getAll);
complaintRouter.get("/my", getMy);
complaintRouter.post("/", create);
complaintRouter.get("/:id", getById);
complaintRouter.put("/:id", update);
complaintRouter.delete("/:id", deleteComplaint);

export default complaintRouter;
