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
      const buckets = await Promise.race([
        this.client.listBuckets(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("MinIO health timeout")), 2500),
        ),
      ]);
      console.log(
        "MinIO buckets:",
        buckets.map((bucket) => bucket.name),
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const minioProvider = new MinioProvider();
