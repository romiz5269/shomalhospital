import { createProxyMiddleware } from "http-proxy-middleware";
import { registry } from "./registry.js";
import { NextFunction, Request, Response } from "express";
import { ServiceDefinition } from "./types.js";
import { ServerResponse } from "http";
import { requestContext } from "../core/context/request-context.js";

export function createServiceProxy(service: ServiceDefinition) {
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
      proxyReq(proxyReq, req) {
        const ctx = requestContext.get();

        if (!ctx) return;

        proxyReq.setHeader("x-request-id", ctx.requestId);
        proxyReq.setHeader("x-trace-id", ctx.traceId);

        if (ctx.userId) {
          proxyReq.setHeader("x-user-id", ctx.userId);
        }

        if (ctx.language) {
          proxyReq.setHeader("x-language", ctx.language);
        }

        if (ctx.sessionId) {
          proxyReq.setHeader("x-session-id", ctx.sessionId);
        }
      },
    },
    // on: {
    //   error(err, req, res) {
    //     if (!(res instanceof ServerResponse)) {
    //       return;
    //     }

    //     if (res.headersSent) {
    //       return;
    //     }

    //     res.writeHead(503, {
    //       "Content-Type": "application/json",
    //     });

    //     res.end(
    //       JSON.stringify({
    //         success: false,
    //         message: `${service.name} service unavailable`,
    //       }),
    //     );
    //   },
    // },
  });
}

export function serviceAvailability(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!registry.isHealthy(serviceName)) {
      return res.status(503).json({
        success: false,
        message: `${serviceName} service unavailable`,
      });
    }

    next();
  };
}
