import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { dbMode } from "./config/prisma.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "15mb" }));
  app.use(express.text({ type: ["text/csv", "text/plain"], limit: "15mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", store: dbMode } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found", details: {} },
    });
  });

  app.use(errorHandler);
  return app;
}
