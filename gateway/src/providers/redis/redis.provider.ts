import { Redis } from "ioredis";
import { redisConfig } from "../../config/redis.config.js";
import { logger } from "../../config/logger.js";

export class RedisProvider {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: "localhost",
      port: 6379,

      lazyConnect: true,

      connectTimeout: 5000,

      enableOfflineQueue: false,

      maxRetriesPerRequest: null,

      keyPrefix: "gateway:",

      retryStrategy(times) {
        return Math.min(times * 1000, 10000);
      },
    });

    // this.registerEvents();
  }

  private registerEvents() {
    this.client.on("connect", () => {
      logger.info("Redis connected");
    });

    this.client.on("ready", () => {
      logger.info("Redis ready");
    });

    this.client.on("error", (err) => {
      logger.error(err, "Redis error");
    });

    this.client.on("close", () => {
      logger.warn("Redis closed");
    });
  }

  async connect() {
    if (
      this.client.status === "connecting" ||
      this.client.status === "connect" ||
      this.client.status === "ready"
    ) {
      return;
    }

    await this.client.connect();

    // منتظر آماده شدن Redis شو
    await new Promise<void>((resolve, reject) => {
      if (this.client.status === "ready") {
        return resolve();
      }

      this.client.once("ready", () => resolve());
      this.client.once("error", reject);
    });
  }

  async disconnect() {
    await this.client.quit();
  }

  async healthCheck() {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.client.status === "ready";
  }
}

export const redisProvider = new RedisProvider();
