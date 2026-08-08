/**
 * In-memory ring buffer of recent HTTP access logs (gateway process).
 */
export type AccessLogEntry = {
  id: string;
  at: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  requestId?: string;
  userId?: string;
};

const MAX = 500;
const g = globalThis as unknown as { __gwAccessLogs?: AccessLogEntry[] };
if (!g.__gwAccessLogs) g.__gwAccessLogs = [];

export function pushAccessLog(entry: Omit<AccessLogEntry, "id" | "at"> & { at?: string }) {
  const row: AccessLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: entry.at || new Date().toISOString(),
    method: entry.method,
    path: entry.path,
    statusCode: entry.statusCode,
    duration: entry.duration,
    requestId: entry.requestId,
    userId: entry.userId,
  };
  g.__gwAccessLogs!.unshift(row);
  if (g.__gwAccessLogs!.length > MAX) g.__gwAccessLogs!.length = MAX;
  return row;
}

export function listAccessLogs(limit = 100) {
  return (g.__gwAccessLogs || []).slice(0, Math.min(limit, MAX));
}

export function accessLogStats(windowMs = 60_000) {
  const since = Date.now() - windowMs;
  const recent = (g.__gwAccessLogs || []).filter(
    (l) => new Date(l.at).getTime() >= since,
  );
  const byStatus: Record<string, number> = {};
  for (const l of recent) {
    const bucket = `${Math.floor(l.statusCode / 100)}xx`;
    byStatus[bucket] = (byStatus[bucket] || 0) + 1;
  }
  return {
    window_seconds: Math.round(windowMs / 1000),
    requests: recent.length,
    by_status: byStatus,
    avg_duration_ms:
      recent.length === 0
        ? 0
        : Math.round(recent.reduce((a, b) => a + b.duration, 0) / recent.length),
  };
}
