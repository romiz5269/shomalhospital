import { registry } from "./registry.js";

export function registerServices() {
  registry.register({
    name: "auth",
    url: process.env.AUTH_SERVICE_URL!,
    healthy: true,
    timeout: 5000,
    failures: 0,
    latency: 0,
  });

  registry.register({
    name: "users",
    url: process.env.USERS_SERVICE_URL!,
    healthy: true,
    timeout: 5000,
    failures: 0,
    latency: 0,
  });

  registry.register({
    name: "media",
    url: process.env.MEDIA_SERVICE_URL!,
    healthy: true,
    timeout: 30000,
    failures: 0,
    latency: 0,
  });
}