import { Router } from "express";
import { registry } from "./registry.js";
import { createServiceProxy } from "./proxy.js";
import { serviceAvailability } from "./service-availability.js";

export function registerProxies(router: Router) {
  for (const service of registry.all()) {
    router.use(
      `/${service.name}`,
      serviceAvailability(service.name),
      createServiceProxy(service),
    );
  }
}
