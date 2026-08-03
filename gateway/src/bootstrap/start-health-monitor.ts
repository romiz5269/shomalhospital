import { startHealthMonitor } from "../health/health.service.js";

export function bootstrapHealthMonitor() {
  startHealthMonitor();
}
