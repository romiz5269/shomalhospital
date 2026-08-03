import { Client } from "minio";
import { minioConfig } from "../../config/minio.config.js";

export class MinioProvider {
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      endPoint: minioConfig.endpoint,

      port: minioConfig.port,

      useSSL: false,

      accessKey: minioConfig.accessKey,

      secretKey: minioConfig.secretKey,
    });
  }

  getClient() {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const buckets = await this.client.listBuckets();

      console.log(
        "MinIO buckets:",
        buckets.map((bucket) => bucket.name),
      );

      return true;
    } catch (error) {
      console.error("MinIO ERROR:", error);

      return false;
    }
  }
}

export const minioProvider = new MinioProvider();
