import type { NextFunction, Request, Response } from "express";
import { authRateLimit } from "./auth-rate-limit.middleware.js";

/** Only rate-limit credential / OTP endpoints — not /me, /health, /logout */
const SENSITIVE = /^\/(login|signup|otp\/request|otp\/verify|refresh)(\/|$)/;

export function authSensitiveRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const sub = (req.path || "").replace(/\/$/, "") || "/";
  if (!SENSITIVE.test(sub)) return next();
  return authRateLimit(req, res, next);
}
