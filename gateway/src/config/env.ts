import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
  USER_SERVICE_URL: process.env.USER_SERVICE_URL,
  MEDIA_SERVICE_URL: process.env.MEDIA_SERVICE_URL,
  PORT: Number(process.env.PORT ?? 3000),

  DATABASE_URL: process.env.DATABASE_URL ?? "",

  REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),

  KAFKA_BROKER: process.env.KAFKA_BROKER ?? "localhost:9092",

  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "localhost",
  MINIO_PORT: Number(process.env.MINIO_PORT ?? 9000),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? "",
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? "",
};
