import { rateLimit } from "express-rate-limit";
import { globalRedisStore } from "../../adapter/redis.js";

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,

  limit: 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  store: globalRedisStore,

  message: {
    success: false,
    message: "Too many requests.",
  },

  skip: () => false,

  validate: {
    trustProxy: false,
  },
});