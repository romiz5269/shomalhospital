import { redisProvider } from "../../../providers/index.js";

export async function redisCheck() {
  try {
    const connected = redisProvider.isConnected();

    return {
      status: connected ? "up" : "down",
      responseTime: 0,
    };
  } catch (error) {
    return {
      status: "down",
      error: String(error),
    };
  }
}
