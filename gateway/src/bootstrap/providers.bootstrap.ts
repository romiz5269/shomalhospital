import { container } from "../core/container.js";
import { TOKENS } from "../core/tokens.js";
import { shutdownHooks } from "../lifecycle/hooks.js";

import {
  redisProvider,
  kafkaProvider,
  minioProvider,
  prismaProvider,
} from "../providers/index.js";

export async function bootstrapProviders() {
  console.log("Initializing providers...");

  // Redis
  await redisProvider.connect();


  console.log("Redis OK");

  // Kafka

  await kafkaProvider.connect();

  console.log("Kafka OK");

  // MinIO

  const minioHealth = await minioProvider.healthCheck();

  if (!minioHealth) {
    throw new Error("MinIO unavailable");
  }

  console.log("MinIO OK");

  // Prisma

  await prismaProvider.connect();

  console.log("Prisma OK");

  // Register Dependencies

  container.register(TOKENS.Redis, redisProvider.getClient());

  container.register(TOKENS.Kafka, kafkaProvider.getProducer());

  container.register(TOKENS.MinIO, minioProvider.getClient());

  container.register(TOKENS.Prisma, prismaProvider.getClient());

  console.log("Providers initialized");
  shutdownHooks.register(() => redisProvider.disconnect());
  shutdownHooks.register(() => kafkaProvider.disconnect());
  shutdownHooks.register(() => prismaProvider.disconnect());
}
