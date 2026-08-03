import { NextFunction, Request, Response } from "express";
import { AppError } from "../core/errors/app-error.js";
import { jwtService } from "../auth/jwt.service.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  const token = authorization.replace("Bearer ", "");

  const payload = jwtService.verify(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
  };

  next();
}
