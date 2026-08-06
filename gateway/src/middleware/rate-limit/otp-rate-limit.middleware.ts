import { rateLimit } from "express-rate-limit";
import { authRedisStore } from "../../adapter/redis.js";

export const otpRateLimit = rateLimit({
  windowMs: 60 * 1000,

  limit: 3,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  store: authRedisStore,

  message: {
    success: false,
    message: "Too many OTP requests.",
  },
});
