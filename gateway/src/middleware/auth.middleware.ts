import { NextFunction, Request, Response } from "express";
import { AppError } from "../core/errors/app-error.js";
import { jwtService } from "../auth/jwt.service.js";
import { redisProvider } from "../providers/redis/redis.provider.js";
import { requestContext } from "../core/context/request-context.js";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = jwtService.verify(token);

    if (payload.type && payload.type !== "access") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!payload.jti) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const banned = await redisProvider.isAccessBlacklisted(payload.jti);
    if (banned) {
      return next(new AppError("Token revoked", 401, "UNAUTHORIZED"));
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      sessionId: "",
    };

    const ctx = requestContext.get();
    if (ctx) {
      ctx.userId = payload.sub;
      ctx.role = payload.role;
      ctx.permissions = payload.permissions;
    }

    next();
  } catch {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
}
