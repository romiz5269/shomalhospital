import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registry } from "./registry.js";
import { createServiceProxy, serviceAvailability } from "./proxy.js";
import {
  authPreRevokeMiddleware,
  createAuthProxy,
} from "./auth-token-sync.js";
import { authSensitiveRateLimit } from "../middleware/rate-limit/auth-sensitive-rate-limit.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

export function registerProxies(router: Router) {
  const pages = registry.all().find((s) => s.name === "pages");
  // Public CMS media (hero video/poster) — no JWT
  if (pages?.url) {
    router.use(
      "/pages/uploads",
      serviceAvailability("pages"),
      createProxyMiddleware({
        target: pages.url,
        changeOrigin: true,
        // Mount strips /pages/uploads → remaining /file.mp4 → /uploads/file.mp4
        pathRewrite: {
          "^/": "/uploads/",
        },
        proxyTimeout: pages.timeout,
        timeout: pages.timeout,
        on: {
          proxyRes(proxyRes) {
            proxyRes.headers["cross-origin-resource-policy"] = "cross-origin";
            proxyRes.headers["access-control-allow-origin"] = "*";
          },
        },
      }),
    );
  }

  for (const service of registry.all()) {
    if (service.name === "auth") {
      router.use(
        `/${service.name}`,
        serviceAvailability(service.name),
        authSensitiveRateLimit,
        authPreRevokeMiddleware,
        createAuthProxy(service),
      );
      continue;
    }

    // Protected microservices — JWT + Redis blacklist at gateway
    router.use(
      `/${service.name}`,
      serviceAvailability(service.name),
      authenticate,
      createServiceProxy(service),
    );
  }
}
