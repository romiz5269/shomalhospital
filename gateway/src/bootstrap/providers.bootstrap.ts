import { container } from "../core/container.js";
import { TOKENS } from "../core/tokens.js";
import { shutdownHooks } from "../lifecycle/hooks.js";

import {
  redisProvider,
  kafkaProvider,
  minioProvider,
  prismaProvider,
} from "../providers/index.js";

const strict = process.env.STRICT_PROVIDERS === "true";

export async function bootstrapProviders() {
  console.log("Initializing providers...");

  await redisProvider.connect();
  console.log("Redis OK");

  try {
    await kafkaProvider.connect();
    console.log("Kafka OK");
    container.register(TOKENS.Kafka, kafkaProvider.getProducer());
    shutdownHooks.register(() => kafkaProvider.disconnect());
  } catch (err) {
    if (strict) throw err;
    console.warn("Kafka skipped (optional for auth proxy)");
  }

  try {
    const minioHealth = await minioProvider.healthCheck();
    if (!minioHealth) throw new Error("MinIO unavailable");
    console.log("MinIO OK");
    container.register(TOKENS.MinIO, minioProvider.getClient());
  } catch (err) {
    if (strict) throw err;
    console.warn("MinIO skipped (optional for auth proxy)");
  }

  try {
    await prismaProvider.connect();
    console.log("Prisma OK");
    container.register(TOKENS.Prisma, prismaProvider.getClient());
    shutdownHooks.register(() => prismaProvider.disconnect());
  } catch (err) {
    if (strict) throw err;
    console.warn("Prisma skipped (optional for auth proxy)");
  }

  container.register(TOKENS.Redis, redisProvider.getClient());
  shutdownHooks.register(() => redisProvider.disconnect());

  console.log("Providers initialized");
}
