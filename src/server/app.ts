import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { env } from "./config.js";
import { authRoutes } from "./routes/auth.routes.js";
import { campaignRoutes } from "./routes/campaign.routes.js";
import { contactRoutes } from "./routes/contact.routes.js";
import { importRoutes } from "./routes/import.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { templateRoutes } from "./routes/template.routes.js";
import { reportRoutes } from "./routes/report.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { errorHandler, notFound } from "./lib/errors.js";
export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.APP_URL, credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  authRoutes,
);
const health = (_req: express.Request, res: express.Response) =>
  res.status(200).json({ status: "ok" });
app.get("/health", health);
app.get("/api/health", health);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use(express.static(path.resolve("dist")));
app.get("/{*splat}", (_req, res) =>
  res.sendFile(path.resolve("dist/index.html")),
);
app.use(notFound);
app.use(errorHandler);
