import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "./config/env.js";
import { corsOrigin } from "./config/cors.js";
import { router } from "./routes/index.js";
import { generalLimit } from "./middleware/rateLimit.js";

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // JSON parse error handler (must be registered BEFORE routes)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof SyntaxError) {
      const raw =
        "rawBody" in req && req.rawBody ? req.rawBody.toString() : "<no-body>";
      return res.status(400).json({ error: "Invalid JSON body", raw });
    }
    return res.status(500).json({ error: "Server error" });
  });

  app.use(cookieParser());

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", generalLimit);

  // router mounts: /api/auth, /api/posts, etc.
  app.use("/api", router);

  return app;
}
