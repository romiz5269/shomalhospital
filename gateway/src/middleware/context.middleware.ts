import { NextFunction, Request, Response } from "express";
import { requestContext } from "../core/context/request-context.js";
import { randomUUID } from "crypto";
import { RequestContext } from "../core/context/context.js";
export function createRequestContext(req: Request): RequestContext {
  return {
    requestId: req.requestId,

    traceId: (req.headers["x-trace-id"] as string | undefined) ?? randomUUID(),

    startedAt: Date.now(),

    ip: req.ip!,

    method: req.method,

    path: req.originalUrl,

    userAgent: req.get("user-agent") ?? undefined,

    language: req.acceptsLanguages()?.[0] ?? "fa",

    userId: req.user?.id,

    role: req.user?.role,

    permissions: req.user?.permissions,

    sessionId: req.user?.sessionId,
  };
}
export function contextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  requestContext.run(createRequestContext(req), next);
}
