import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { createRouter } from "./routes/index.js";
import { notFound } from "./middleware/not-found.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";
import { httpLogger } from "./middleware/logger.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { contextMiddleware } from "./middleware/context.middleware.js";
import { accessLogMiddleware } from "./middleware/access-log.middleware.js";
import { globalRateLimit } from "./middleware/rate-limit/global-rate-limit.middleware.js";

const isApiProxy = (path: string) => path.startsWith("/api/v1");

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: [
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "X-Request-Id",
        "X-User-Id",
        "Accept-Language",
      ],
    }),
  );

  // compression breaks http-proxy-middleware — skip for proxied routes
  app.use((req, res, next) => {
    if (isApiProxy(req.path)) return next();
    return compression()(req, res, next);
  });

  // body parser breaks multipart proxy uploads
  app.use((req, res, next) => {
    if (isApiProxy(req.path)) return next();
    return express.json()(req, res, next);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "gateway" });
  });

  app.use(requestId);
  app.use(contextMiddleware);
  app.use(httpLogger);
  app.use(accessLogMiddleware);
  // app.use(globalRateLimit);

  app.use("/api/v1", createRouter());

  app.use(notFound);
  app.use(errorMiddleware);

  return app;
}
