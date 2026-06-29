import { Router } from "express";
import {
  deviceToken,
  listNotifications,
  markRead,
  preferences,
  readAll,
  updatePreferences,
} from "../controllers/notification.controller";
import { protect, requireCitizen } from "../middlewares/auth.middleware";

const notificationRouter = Router();

notificationRouter.use(protect, requireCitizen);
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/read-all", readAll);
notificationRouter.get("/preferences", preferences);
notificationRouter.patch("/preferences", updatePreferences);
notificationRouter.post("/device-token", deviceToken);
notificationRouter.patch("/:id/read", markRead);

export default notificationRouter;
