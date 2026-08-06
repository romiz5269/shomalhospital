import { env } from "./env.js";

export const kafkaConfig = {
  brokers: [env.KAFKA_BROKER],
  clientId: "hospital-gateway",
};
