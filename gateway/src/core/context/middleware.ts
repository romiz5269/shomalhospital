import { randomUUID } from "node:crypto";

import { NextFunction, Request, Response } from "express";

import { requestContext } from "./request-context.js";

export function contextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  requestContext.run(
    {
      requestId: req.requestId,

      traceId: randomUUID(),

      startedAt: Date.now(),

      ip: req.ip ?? "notfound",

      method: req.method,

      path: req.originalUrl,

      userAgent: req.get("user-agent"),
    },
    next,
  );
}
