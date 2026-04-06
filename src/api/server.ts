import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: "http://localhost:8081",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed.", error);
    process.exit(1);
  }
}

void startServer();
