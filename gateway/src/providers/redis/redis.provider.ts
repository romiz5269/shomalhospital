import { Redis } from "ioredis";

export class RedisProvider {
  /** rate-limit گیت‌وی — با prefix */
  private readonly client: Redis;

  /** blacklist توکن‌ها — بدون prefix: auth:bl:jti:* */
  private readonly shared: Redis;

  constructor() {
    const base = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        return Math.min(times * 1000, 10000);
      },
    } as const;

    this.client = new Redis({
      ...base,
      keyPrefix: "gateway:",
    });

    this.shared = new Redis({
      ...base,
    });
  }

  async connect() {
    await Promise.all([this.connectOne(this.client), this.connectOne(this.shared)]);
  }

  private async connectOne(client: Redis) {
    if (
      client.status === "connecting" ||
      client.status === "connect" ||
      client.status === "ready"
    ) {
      return;
    }

    await client.connect();

    await new Promise<void>((resolve, reject) => {
      if (client.status === "ready") return resolve();
      client.once("ready", () => resolve());
      client.once("error", reject);
    });
  }

  async disconnect() {
    await Promise.all([this.client.quit(), this.shared.quit()]);
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

  getSharedClient() {
    return this.shared;
  }

  isConnected() {
    return this.client.status === "ready" && this.shared.status === "ready";
  }

  async isAccessBlacklisted(jti: string): Promise<boolean> {
    const result = await this.shared.exists(`auth:bl:jti:${jti}`);
    return result === 1;
  }

  /** Auth logout/refresh → gateway Redis blacklist */
  async blacklistJti(jti: string, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(Math.floor(ttlSeconds), 60);
    await this.shared.set(`auth:bl:jti:${jti}`, "1", "EX", ttl);
  }

  async blacklistMany(
    items: Array<{ jti: string; ttl_seconds: number }>,
  ): Promise<void> {
    if (!items.length) return;
    await Promise.all(
      items.map((item) => this.blacklistJti(item.jti, item.ttl_seconds)),
    );
  }
}

export const redisProvider = new RedisProvider();
