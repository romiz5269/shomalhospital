import { registry } from "./registry.js";

export function registerServices() {
  const entries = [
    ["auth", process.env.AUTH_SERVICE_URL],
    ["users", process.env.USERS_SERVICE_URL ?? process.env.USER_SERVICE_URL],
    ["appointment", process.env.APPOINTMENT_SERVICE_URL],
    ["hiring", process.env.HIRING_SERVICE_URL],
    ["pages", process.env.PAGES_SERVICE_URL],
    ["media", process.env.MEDIA_SERVICE_URL],
  ] as const;

  for (const [name, url] of entries) {
    if (!url) continue;
    registry.register({
      name,
      url,
      healthy: true,
      timeout: name === "media" ? 120_000 : name === "pages" ? 120_000 : 30_000,
      failures: 0,
      latency: 0,
    });
  }
}