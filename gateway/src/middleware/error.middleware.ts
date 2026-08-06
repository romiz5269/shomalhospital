import { Request, Response, NextFunction } from "express";

import { AppError } from "../core/errors/index.js";

import { logger } from "../config/logger.js";

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,

      code: error.code,

      message: error.message,

      details: error.details ?? null,

      requestId: req.requestId,
    });
  }

  logger.error({
    error,

    requestId: req.requestId,
  });

  return res.status(500).json({
    success: false,

    code: "INTERNAL_ERROR",

    message: "Internal server error",

    requestId: req.requestId,
  });
}
