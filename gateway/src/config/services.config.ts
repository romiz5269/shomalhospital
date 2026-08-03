import { env } from "./env.js";
import type { ServiceDefinition } from "../proxy/types.js";

export const services: ServiceDefinition[] = [
  {
    name: "auth",
    url: env.AUTH_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
  {
    name: "users",
    url: env.USER_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
  {
    name: "media",
    url: env.MEDIA_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
];
