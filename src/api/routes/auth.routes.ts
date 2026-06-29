import { Router } from "express";
import {
  forgotPassword,
  googleAuth,
  login,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/google", googleAuth);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
