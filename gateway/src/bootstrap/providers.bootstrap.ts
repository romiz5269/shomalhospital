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
/** Local/dev: skip Kafka/MinIO/Prisma so gateway listens in ~1s after Redis. */
const optional =
  process.env.ENABLE_OPTIONAL_PROVIDERS === "true" || strict;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function bootstrapProviders() {
  console.log("Initializing providers...");

  await withTimeout(redisProvider.connect(), 5000, "Redis");
  console.log("Redis OK");
  container.register(TOKENS.Redis, redisProvider.getClient());
  shutdownHooks.register(() => redisProvider.disconnect());

  if (!optional) {
    console.log("Optional providers skipped (Kafka/MinIO/Prisma) — set ENABLE_OPTIONAL_PROVIDERS=true to enable");
    console.log("Providers initialized");
    return;
  }

  try {
    await withTimeout(kafkaProvider.connect(), 2500, "Kafka");
    console.log("Kafka OK");
    container.register(TOKENS.Kafka, kafkaProvider.getProducer());
    shutdownHooks.register(() => kafkaProvider.disconnect());
  } catch (err) {
    if (strict) throw err;
    console.warn("Kafka skipped (optional)");
  }

  try {
    const minioHealth = await withTimeout(minioProvider.healthCheck(), 2000, "MinIO");
    if (!minioHealth) throw new Error("MinIO unavailable");
    console.log("MinIO OK");
    container.register(TOKENS.MinIO, minioProvider.getClient());
  } catch (err) {
    if (strict) throw err;
    console.warn("MinIO skipped (optional)");
  }

  try {
    await withTimeout(prismaProvider.connect(), 3000, "Prisma");
    console.log("Prisma OK");
    container.register(TOKENS.Prisma, prismaProvider.getClient());
    shutdownHooks.register(() => prismaProvider.disconnect());
  } catch (err) {
    if (strict) throw err;
    console.warn("Prisma skipped (optional)");
  }

  console.log("Providers initialized");
}
