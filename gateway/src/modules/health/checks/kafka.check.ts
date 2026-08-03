import { kafkaProvider } from "../../../providers/index.js";

export async function kafkaCheck() {
  try {
    const healthy = await kafkaProvider.healthCheck();

    return {
      status: healthy ? "up" : "down",
    };
  } catch (error) {
    return {
      status: "down",
      error: String(error),
    };
  }
}
