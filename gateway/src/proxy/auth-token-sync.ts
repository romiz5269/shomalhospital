import { NextFunction, Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { jwtService } from "../auth/jwt.service.js";
import { redisProvider } from "../providers/redis/redis.provider.js";
import { requestContext } from "../core/context/request-context.js";
import type { ServiceDefinition } from "./types.js";

function remainingTtlFromExp(exp?: number): number {
  if (!exp) return 60;
  const ttl = exp - Math.floor(Date.now() / 1000);
  return Math.max(ttl, 60);
}

/** Blacklist access token jti on logout before forwarding to auth service. */
export async function authPreRevokeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const path = req.path || "";
  if (!path.endsWith("/logout") && !path.includes("/logout")) {
    return next();
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    return next();
  }

  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = jwtService.verify(token);
    if (payload.jti) {
      await redisProvider.blacklistJti(
        payload.jti,
        remainingTtlFromExp(payload.exp),
      );
    }
  } catch {
    // auth service returns 401 for bad tokens
  }

  next();
}

/** Auth proxy — no body parser upstream; auth service writes Redis blacklist on logout/refresh. */
export function createAuthProxy(service: ServiceDefinition) {
  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    xfwd: true,
    ws: true,
    proxyTimeout: service.timeout,
    timeout: service.timeout,
    pathRewrite: {
      [`^/${service.name}`]: "",
    },
    on: {
      proxyReq(proxyReq) {
        proxyReq.removeHeader("x-user-id");
        proxyReq.removeHeader("x-session-id");
        proxyReq.removeHeader("x-user-role");
        proxyReq.removeHeader("x-permissions");

        const ctx = requestContext.get();
        if (!ctx) return;

        proxyReq.setHeader("x-request-id", ctx.requestId);
        proxyReq.setHeader("x-trace-id", ctx.traceId);
        if (ctx.language) {
          proxyReq.setHeader("x-language", ctx.language);
        }
      },
      error(_err, _req, res) {
        if ("writeHead" in res && typeof res.writeHead === "function") {
          if (!res.headersSent) {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: false,
                message: "auth service unavailable",
              }),
            );
          }
        }
      },
    },
  });
}
