import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { requestContext } from "../core/context/request-context.js";

export function accessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const started = Date.now();

  res.on("finish", () => {
    const context = requestContext.get()

    logger.info({
      requestId: context?.requestId,
      traceId: context?.traceId,
      userId: context?.userId,

      method: req.method,
      path: req.originalUrl,

      statusCode: res.statusCode,

      duration: Date.now() - started,
    });
  });

  next();
}
