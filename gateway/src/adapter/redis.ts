import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { redisProvider } from "../providers/index.js";

const client = redisProvider.getClient();

export const redisStore = new RedisStore({
  sendCommand: async (
    command: string,
    ...args: string[]
  ): Promise<RedisReply> => {
    return (await client.call(command, ...args)) as RedisReply;
  },
});
