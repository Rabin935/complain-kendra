import http from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middlewares/error.middleware";
import { apiRateLimiter, sanitizeRequest } from "./middlewares/security.middleware";
import authRouter from "./routes/auth.routes";
import commentRouter from "./routes/comment.routes";
import complaintRouter from "./routes/complaint.routes";
import gamificationRouter from "./routes/gamification.routes";
import internalRouter from "./routes/internal.routes";
import notificationRouter from "./routes/notification.routes";
import officerRouter from "./routes/officer.routes";
import uploadRouter from "./routes/upload.routes";
import userRouter from "./routes/user.routes";
import wardRouter from "./routes/ward.routes";
import { initializeRealtime } from "./sockets/realtime";
import { getUploadRoot } from "./utils/upload.utils";

dotenv.config();

const app = express();
const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isNaN(parsedPort) ? 5000 : parsedPort;
let databaseStatus: "connecting" | "connected" | "error" = "connecting";
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(apiRateLimiter);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest);
app.use("/uploads", express.static(getUploadRoot()));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/wards", wardRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1", commentRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/officer", officerRouter);
app.use("/api/v1/uploads", uploadRouter);
app.use("/api/v1", gamificationRouter);
app.use("/internal", internalRouter);

// Compatibility aliases for the existing Expo services.
app.use("/api/auth", authRouter);
app.use("/api/wards", wardRouter);
app.use("/api/complaints", complaintRouter);

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    database: databaseStatus,
    port: PORT,
    apiVersion: "v1",
  });
});

app.get("/api/v1/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    database: databaseStatus,
    port: PORT,
    uploads: path.relative(process.cwd(), getUploadRoot()),
  });
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  const httpServer = http.createServer(app);
  initializeRealtime(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });

  try {
    await connectDatabase();
    databaseStatus = "connected";
  } catch (error) {
    databaseStatus = "error";
    console.error("Database connection failed. API server is still running.", error);
  }
}

void startServer();
