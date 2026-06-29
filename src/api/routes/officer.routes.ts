import { Router } from "express";
import {
  officerLogin,
  officerLogout,
  officerLogoutAll,
  officerSessions,
} from "../controllers/officer-auth.controller";
import { protect, requireOfficer } from "../middlewares/auth.middleware";

const officerRouter = Router();

officerRouter.post("/auth/login", officerLogin);
officerRouter.post("/auth/logout", officerLogout);
officerRouter.get("/auth/sessions", protect, requireOfficer, officerSessions);
officerRouter.post("/auth/logout-all", protect, requireOfficer, officerLogoutAll);

export default officerRouter;
