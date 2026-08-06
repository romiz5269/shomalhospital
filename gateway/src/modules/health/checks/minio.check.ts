import { minioProvider } from "../../../providers/index.js";

export async function minioCheck() {
  try {
    const healthy = await minioProvider.healthCheck();

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
