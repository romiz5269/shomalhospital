import { NextFunction, Request, Response } from "express";
import { registry } from "./registry.js";

export function serviceAvailability(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (registry.isHealthy(serviceName)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        service: serviceName,
        message: `${serviceName} service is currently unavailable.`,
      },
      timestamp: new Date().toISOString(),
    });
  };
}
