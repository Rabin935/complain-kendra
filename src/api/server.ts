import cors from "cors";
import dotenv from "dotenv";
import express from "express";

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

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
