import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";
import complaintRouter from "./routes/complaint.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        callback(null, true);
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/complaints", complaintRouter);

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
