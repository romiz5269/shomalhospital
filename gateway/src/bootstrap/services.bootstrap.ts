import { services } from "../config/services.config.js";
import { registry } from "../proxy/registry.js";

export function bootstrapServices(): void {
  for (const service of services) {
    registry.register(service);
  }
}
