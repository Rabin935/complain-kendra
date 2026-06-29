import dotenv from "dotenv";
import { app } from "./app";
import { connectDatabase } from "./config/database";

dotenv.config();

const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isNaN(parsedPort) ? 5000 : parsedPort;

export async function startServer(): Promise<void> {
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

if (require.main === module) {
  void startServer();
}
