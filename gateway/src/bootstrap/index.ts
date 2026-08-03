import { createApp } from "../app.js";
import { bootstrapProviders } from "./providers.bootstrap.js";
import { bootstrapServices } from "./services.bootstrap.js";

import "../lifecycle/signals.js";

export async function bootstrap() {
  await bootstrapProviders();

  bootstrapServices();

  const app = createApp();

  return app;
}
