import { shutdownHooks } from "./hooks.js";
import { logger } from "../config/logger.js";

export async function shutdown(signal: string) {
  logger.info(`${signal} received`);

  await shutdownHooks.execute();

  process.exit(0);
}
