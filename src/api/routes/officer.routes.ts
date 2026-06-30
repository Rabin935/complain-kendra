import { Router } from "express";
import {
  logout,
  officerLogin,
  officerRefresh,
  officerSessionDelete,
  officerSessions,
} from "../controllers/auth.controller";
import {
  alerts,
  analytics,
  acceptComplaint,
  ban,
  complaintDetail,
  complaints,
  createRule,
  dashboard,
  escalationRules,
  note,
  officialComment,
  patchAssign,
  patchDepartment,
  patchPriority,
  patchRule,
  patchStatus,
  rejectComplaint,
  reopenComplaint,
  removeRule,
  resolveComplaint,
  settings,
  startWork,
  unban,
  updateSettings,
  userDetail,
  users,
  warn,
} from "../controllers/officer.controller";
import { protect, requireOfficer } from "../middlewares/auth.middleware";

const officerRouter = Router();

officerRouter.post("/auth/login", officerLogin);
officerRouter.post("/auth/logout", logout);
officerRouter.post("/auth/refresh", officerRefresh);
officerRouter.get("/auth/sessions", protect, requireOfficer, officerSessions);
officerRouter.delete("/auth/sessions/:id", protect, requireOfficer, officerSessionDelete);

officerRouter.use(protect, requireOfficer);
officerRouter.get("/dashboard", dashboard);
officerRouter.get("/complaints", complaints);
officerRouter.get("/complaints/:id", complaintDetail);
officerRouter.patch("/complaints/:id/status", patchStatus);
officerRouter.patch("/complaints/:id/assign", patchAssign);
officerRouter.patch("/complaints/:id/accept", acceptComplaint);
officerRouter.patch("/complaints/:id/start", startWork);
officerRouter.patch("/complaints/:id/resolve", resolveComplaint);
officerRouter.patch("/complaints/:id/reject", rejectComplaint);
officerRouter.patch("/complaints/:id/reopen", reopenComplaint);
officerRouter.patch("/complaints/:id/department", patchDepartment);
officerRouter.patch("/complaints/:id/priority", patchPriority);
officerRouter.post("/complaints/:id/notes", note);
officerRouter.post("/complaints/:id/comments", officialComment);
officerRouter.get("/analytics", analytics);
officerRouter.get("/alerts", alerts);
officerRouter.get("/users", users);
officerRouter.get("/users/:id", userDetail);
officerRouter.post("/users/:id/warn", warn);
officerRouter.patch("/users/:id/ban", ban);
officerRouter.patch("/users/:id/unban", unban);
officerRouter.get("/escalation-rules", escalationRules);
officerRouter.post("/escalation-rules", createRule);
officerRouter.patch("/escalation-rules/:id", patchRule);
officerRouter.delete("/escalation-rules/:id", removeRule);
officerRouter.get("/settings", settings);
officerRouter.patch("/settings", updateSettings);

export default officerRouter;
