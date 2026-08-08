import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { AppError } from "../core/errors/app-error.js";
import { accessLogStats, listAccessLogs } from "../ops/access-log-store.js";
import { env } from "../config/env.js";

function requireAdmin(req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) {
  const role = String(req.user?.role ?? "").toLowerCase();
  const perms = new Set((req.user?.permissions ?? []).map(String));
  const ok =
    role === "admin" ||
    role === "super_admin" ||
    perms.has("auth:manage") ||
    perms.has("pages:manage");
  if (!ok) return next(new AppError("Forbidden", 403, "FORBIDDEN"));
  next();
}

async function ping(url: string, id: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return { id, ok: res.ok, status: res.status, latency_ms: Date.now() - started, url };
  } catch {
    return { id, ok: false, status: 0, latency_ms: Date.now() - started, url };
  }
}

export function createOpsRouter() {
  const router = Router();

  router.get("/logs", authenticate, requireAdmin, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({
      logs: listAccessLogs(limit),
      traffic: accessLogStats(60_000),
      traffic_5m: accessLogStats(300_000),
    });
  });

  router.get("/health", authenticate, requireAdmin, async (_req, res) => {
    const targets = [
      { id: "auth", url: env.AUTH_SERVICE_URL! },
      { id: "users", url: env.USERS_SERVICE_URL! },
      { id: "appointment", url: env.APPOINTMENT_SERVICE_URL! },
      { id: "pages", url: env.PAGES_SERVICE_URL! },
    ];
    const services = await Promise.all(targets.map((t) => ping(t.url, t.id)));
    res.json({
      ok: services.every((s) => s.ok),
      checked_at: new Date().toISOString(),
      gateway: { status: "ok" },
      services,
      traffic: accessLogStats(60_000),
    });
  });

  return router;
}
