import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { authRedisStore } from "../../adapter/redis.js";

const isDev = (process.env.NODE_ENV ?? "development") !== "production";
const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (isDev ? 100 : 20));

const noopRateLimit = (_req: Request, _res: Response, next: NextFunction) =>
  next();

export const authRateLimit =
  maxAttempts <= 0
    ? noopRateLimit
    : rateLimit({
        windowMs: 60 * 1000,
        limit: maxAttempts,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        store: authRedisStore,
        skipSuccessfulRequests: true,
        message: {
          success: false,
          message:
            "Too many login attempts. Please wait one minute and try again.",
        },
      });
