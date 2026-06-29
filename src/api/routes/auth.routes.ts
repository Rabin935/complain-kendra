import { Router } from "express";
import {
  forgotPassword,
  googleAuth,
  login,
  logout,
  otpSend,
  otpVerify,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/refresh", refresh);
authRouter.post("/google", googleAuth);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/otp/send", otpSend);
authRouter.post("/otp/verify", otpVerify);

export default authRouter;
