import { ServiceDefinition } from "./types.js";

export class ServiceRegistry {
  private readonly services = new Map<string, ServiceDefinition>();
  register(service: ServiceDefinition) {
    this.services.set(service.name, service);
  }
  updateLatency(name: string, latency: number) {
    this.get(name).latency = latency;
  }

  incrementFailures(name: string) {
    this.get(name).failures++;
  }

  resetFailures(name: string) {
    this.get(name).failures = 0;
  }

  updateLastCheck(name: string) {
    this.get(name).lastCheck = Date.now();
  }
  get(name: string) {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service '${name}' is not registered.`);
    }

    return service;
  }

  all() {
    return [...this.services.values()];
  }
  setHealthy(name: string, healthy: boolean) {
    const service = this.get(name);

    service.healthy = healthy;
  }
  isHealthy(name: string) {
    return this.get(name).healthy;
  }
}

export const registry = new ServiceRegistry();
