import { Redis } from "ioredis";

export interface IRedisProvider {
  client: Redis;

  connect(): Promise<void>;

  disconnect(): Promise<void>;

  isConnected(): boolean;
}
