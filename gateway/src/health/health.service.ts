import axios from "axios";
import { registry } from "../proxy/registry.js";
import { logger } from "../config/logger.js";



export async function checkServices() {
  for (const service of registry.all()) {
    const started = Date.now();

    try {
      await axios.get(`${service.url}/health`, {
        timeout: service.timeout,
      });

      registry.setHealthy(service.name, true);
      registry.resetFailures(service.name);
      registry.updateLatency(
        service.name,
        Date.now() - started,
      );
      registry.updateLastCheck(service.name);
    } catch {
      registry.setHealthy(service.name, false);
      registry.incrementFailures(service.name);
    }
  }
}

export async function checkServicesHealth() {
  const services = registry.all();

  await Promise.all(
    services.map((service) => checkServices()),
  );
}

export function startHealthMonitor(interval = 30000) {
  logger.info("Starting Health Monitor...");

  checkServicesHealth();

  return setInterval(checkServicesHealth, interval);
}
