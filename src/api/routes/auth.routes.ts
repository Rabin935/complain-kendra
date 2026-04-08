import { Router } from "express";
import { googleLogin, login, register } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/google", googleLogin);

export default authRouter;
