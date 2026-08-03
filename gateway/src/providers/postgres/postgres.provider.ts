import { Pool } from "pg";
import { env } from "../../config/env.js";

export class PostgresProvider {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,

      max: 10,

      idleTimeoutMillis: 30000,
    });
  }

  async connect() {
    const client = await this.pool.connect();

    client.release();

    console.log("✅ PostgreSQL connected");
  }

  async disconnect() {
    await this.pool.end();

    console.log("PostgreSQL disconnected");
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");

      return true;
    } catch (error) {
      console.error("Postgres error:", error);

      return false;
    }
  }

  getClient() {
    return this.pool;
  }
}

export const postgresProvider = new PostgresProvider();
