import { Kafka, Producer, logLevel } from "kafkajs";
import { kafkaConfig } from "../../config/kafka.config.js";

export class KafkaProvider {
  private readonly kafka: Kafka;
  private producer: Producer | null = null;
  private connected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      logLevel: logLevel.ERROR,
      connectionTimeout: 2000,
      requestTimeout: 3000,
      retry: {
        retries: 1,
        initialRetryTime: 200,
        maxRetryTime: 1000,
      },
    });
  }

  async connect(): Promise<void> {
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      retry: { retries: 0 },
    });

    // Fail fast when Kafka is not part of local stack
    const timeoutMs = 3500;
    await Promise.race([
      this.producer.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Kafka connect timeout")), timeoutMs),
      ),
    ]);

    this.connected = true;
    console.log("✅ Kafka producer connected");
  }

  getProducer(): Producer {
    if (!this.producer || !this.connected) {
      throw new Error("Kafka producer is not connected");
    }
    return this.producer;
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      try {
        await this.producer.disconnect();
      } catch {
        /* ignore */
      }
      this.producer = null;
      this.connected = false;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const admin = this.kafka.admin();
      await Promise.race([
        admin.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 2000),
        ),
      ]);
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch {
      return false;
    }
  }
}

export const kafkaProvider = new KafkaProvider();
