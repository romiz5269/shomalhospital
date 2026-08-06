import { Router } from "express";
import { registry } from "./registry.js";
import { createServiceProxy, serviceAvailability } from "./proxy.js";
import {
  authPreRevokeMiddleware,
  createAuthProxy,
} from "./auth-token-sync.js";
import { authSensitiveRateLimit } from "../middleware/rate-limit/auth-sensitive-rate-limit.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

export function registerProxies(router: Router) {
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
