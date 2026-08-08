import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Lightweight ring of recent gateway-facing requests captured client-side is not enough —
 *  this route aggregates service health for the system console. */
export async function GET(_req: NextRequest) {
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080/api/v1";
  const targets = [
    { id: "gateway", url: "http://127.0.0.1:8080/health" },
    { id: "auth", url: "http://127.0.0.1:5001/health" },
    { id: "users", url: "http://127.0.0.1:5002/health" },
    { id: "appointment", url: "http://127.0.0.1:5003/health" },
    { id: "insurance", url: "http://127.0.0.1:5004/health" },
    { id: "cms", url: "http://127.0.0.1:5005/health" },
  ];

  const results = await Promise.all(
    targets.map(async (t) => {
      const started = Date.now();
      try {
        const res = await fetch(t.url, { signal: AbortSignal.timeout(2500), cache: "no-store" });
        return {
          id: t.id,
          ok: res.ok,
          status: res.status,
          latency_ms: Date.now() - started,
        };
      } catch {
        return { id: t.id, ok: false, status: 0, latency_ms: Date.now() - started };
      }
    }),
  );

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    gateway,
    checked_at: new Date().toISOString(),
    services: results,
  });
}
