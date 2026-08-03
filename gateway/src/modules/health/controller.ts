import type { Request, Response } from "express";
import { healthService } from "./service.js";

export async function healthController(
  _req: Request,
  res: Response
) {
  try {
    const result = await healthService.check();

    const statusCode =
      result.status === "healthy"
        ? 200
        : 503;

    return res
      .status(statusCode)
      .json(result);

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Health check failed",
    });
  }
}