import { bootstrap } from "./bootstrap/index.js";
import { env } from "./config/index.js";
import { logger } from "./config/logger.js";

async function start() {
  try {
    const app = await bootstrap();

    app.listen(env.PORT, () => {
      logger.info(`Gateway started on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start gateway");
    process.exit(1);
  }
}

start();
