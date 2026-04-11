import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";
import complaintRouter from "./routes/complaint.routes";

dotenv.config();

const app = express();
const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isNaN(parsedPort) ? 5000 : parsedPort;

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

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed.", error);
    process.exit(1);
  }
}

void startServer();
