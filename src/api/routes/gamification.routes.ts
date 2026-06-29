import { Router } from "express";
import {
  badges,
  leaderboard,
  leaderboardMe,
} from "../controllers/gamification.controller";
import { protect, requireCitizen } from "../middlewares/auth.middleware";

const gamificationRouter = Router();

gamificationRouter.get("/leaderboard", leaderboard);
gamificationRouter.get("/leaderboard/me", protect, requireCitizen, leaderboardMe);
gamificationRouter.get("/badges", badges);

export default gamificationRouter;
