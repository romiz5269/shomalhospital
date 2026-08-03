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
import { securityMiddleware } from "./middleware/security.middleware.js";
import { globalRateLimit } from "./middleware/rate-limit/global-rate-limit.middleware.js";

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(cors());

  app.use(compression());

  app.use(express.json());

  app.use(requestId);

  app.use(contextMiddleware);

  app.use(httpLogger);

  app.use(accessLogMiddleware);

  app.use(securityMiddleware);

  app.use(globalRateLimit);

  app.use("/api/v1", createRouter());

  app.use(notFound);

  app.use(errorMiddleware);

  return app;
}
