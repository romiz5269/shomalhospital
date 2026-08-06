import { Kafka, Producer } from "kafkajs";
import { kafkaConfig } from "../../config/kafka.config.js";

export class KafkaProvider {
  private readonly kafka: Kafka;

  private producer: Producer | null = null;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
  }

  async connect(): Promise<void> {
    this.producer = this.kafka.producer();

    await this.producer.connect();

    console.log("✅ Kafka producer connected");
  }

  getProducer(): Producer {
    if (!this.producer) {
      throw new Error("Kafka producer is not connected");
    }

    return this.producer;
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();

      await admin.connect();

      await admin.listTopics();

      await admin.disconnect();

      return true;
    } catch {
      return false;
    }
  }
}

export const kafkaProvider = new KafkaProvider();
