import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { redisProvider } from "../providers/index.js";

async function sendCommand(
  command: string,
  ...args: string[]
): Promise<RedisReply> {
  if (!redisProvider.isConnected()) {
    await redisProvider.connect();
  }
  const client = redisProvider.getClient();
  return (await client.call(command, ...args)) as RedisReply;
}

function createRedisStore(prefix: string) {
  return new RedisStore({
    prefix: `gateway:rl:${prefix}:`,
    sendCommand,
  });
}

export const globalRedisStore = createRedisStore("global");
export const authRedisStore = createRedisStore("auth");
