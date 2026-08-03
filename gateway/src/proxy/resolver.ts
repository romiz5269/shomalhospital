import { registry } from "./registry.js";
import type { ServiceDefinition } from "./types.js";

export class ServiceResolver {
  resolve(name: string): ServiceDefinition {
    const service = registry.get(name);

    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    return service;
  }
}

export const serviceResolver = new ServiceResolver();
