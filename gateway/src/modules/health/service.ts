import { kafkaCheck } from "./checks/kafka.check.js";
import { minioCheck } from "./checks/minio.check.js";
import { redisCheck } from "./checks/redis.check.js";

class HealthService {
  async check() {
    const [redis, kafka, minio] = await Promise.all([
      redisCheck(),
      kafkaCheck(),
      minioCheck(),
    ]);

    const services = {
      redis,
      kafka,
      minio,
    };

    const healthy = Object.values(services).every(
      (service) => service.status === "up",
    );

    return {
      status: healthy ? "healthy" : "degraded",
      service: "gateway",
      services,
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
