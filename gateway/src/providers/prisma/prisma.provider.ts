import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../../config/env.js";
import { PrismaClient } from "../../generated/prisma/client.js";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export class PrismaProvider {
  private readonly client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      adapter,
      log: [
        {
          emit: "stdout",
          level: "error",
        },
      ],
    });
  }

  async connect() {
    await this.client.$connect();

    console.log("✅ Prisma connected");
  }

  async disconnect() {
    await this.client.$disconnect();
  }

  async healthCheck() {
    try {
      await this.client.$queryRaw`SELECT 1`;

      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }

  getClient() {
    return this.client;
  }
}

export const prismaProvider = new PrismaProvider();
