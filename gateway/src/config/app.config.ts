import { env } from "./env.js";

export const appConfig = {
  name: "hospital-gateway",
  env: env.NODE_ENV,
  port: env.PORT,
};
