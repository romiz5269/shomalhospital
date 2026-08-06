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
    url: env.USERS_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
  {
    name: "appointment",
    url: env.APPOINTMENT_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
  {
    name: "hiring",
    url: env.HIRING_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 30_000,
  },
  {
    name: "pages",
    url: env.PAGES_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 120_000,
  },
  {
    name: "media",
    url: env.MEDIA_SERVICE_URL!,
    version: "v1",
    healthy: true,
    timeout: 120_000,
  },
];
