import { Router } from "express";
import { cities, detail, list, lookup } from "../controllers/ward.controller";

const wardRouter = Router();

wardRouter.get("/cities", cities);
wardRouter.get("/", list);
wardRouter.get("/:id", detail);
wardRouter.post("/lookup", lookup);

export default wardRouter;
