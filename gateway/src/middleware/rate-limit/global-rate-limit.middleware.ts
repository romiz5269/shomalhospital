import { rateLimit } from "express-rate-limit";
import { redisStore } from "../../adapter/redis.js";

export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,

  limit: 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  store : redisStore,

  message: {
    success: false,
    message: "Too many requests.",
  },

  skip: () => false,

  validate: {
    trustProxy: false,
  },
});