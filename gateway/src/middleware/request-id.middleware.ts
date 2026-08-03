import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers["x-request-id"]?.toString() ?? randomUUID();

  res.setHeader("x-request-id", id);

  req.requestId = id;

  next();
}
