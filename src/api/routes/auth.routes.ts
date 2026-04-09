import { Router } from "express";
import { forgotPassword, googleAuth, login, register } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/google", googleAuth);
authRouter.post("/forgot-password", forgotPassword);

export default authRouter;
