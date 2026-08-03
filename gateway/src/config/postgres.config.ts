import { env } from "./env.js";

export const postgresConfig = {
  url: env.DATABASE_URL,
};
