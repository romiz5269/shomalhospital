import { Redis } from "ioredis";

function redisOptions() {
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password,
    lazyConnect: true,
    connectTimeout: 3000,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      // Fail fast during boot — do not hang forever if Redis is down
      if (times > 2) return null;
      return 200;
    },
  } as const;
}

export class RedisProvider {
  /** rate-limit gateway — with prefix */
  private readonly client: Redis;

  /** token blacklist — no prefix: auth:bl:jti:* */
  private readonly shared: Redis;

  constructor() {
    const base = redisOptions();
    this.client = new Redis({
      ...base,
      keyPrefix: "gateway:",
    });
    this.shared = new Redis({ ...base });
  }

  async connect() {
    await Promise.all([this.connectOne(this.client), this.connectOne(this.shared)]);
    // Prove Redis answers (not just TCP open)
    const pong = await this.shared.ping();
    if (pong !== "PONG") {
      throw new Error(`Redis ping failed: ${String(pong)}`);
    }
  }

  private async connectOne(client: Redis) {
    if (client.status === "ready") return;
    if (client.status === "connecting" || client.status === "connect") {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Redis connect timeout")), 4000);
        client.once("ready", () => {
          clearTimeout(t);
          resolve();
        });
        client.once("error", (e) => {
          clearTimeout(t);
          reject(e);
        });
      });
      return;
    }

    await client.connect();

    if (client.status === "ready") return;

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("Redis ready timeout")), 4000);
      client.once("ready", () => {
        clearTimeout(t);
        resolve();
      });
      client.once("error", (e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  async disconnect() {
    await Promise.allSettled([this.client.quit(), this.shared.quit()]);
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
