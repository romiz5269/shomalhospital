import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisProvider } from "../../providers/redis/redis.provider.js";
import { redisStore } from "../../adapter/redis.js";

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,

  limit: 5,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  store: redisStore,

  message: {
    success: false,
    message: "Too many login attempts.",
  },
});
