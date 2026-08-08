/**
 * In-memory activity feed for admin console (client pushes + server polls).
 * For production, replace with gateway log drain / APM.
 */
type LogEntry = {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  meta?: Record<string, unknown>;
};

const MAX = 300;
const g = globalThis as unknown as { __shomalLogs?: LogEntry[] };
if (!g.__shomalLogs) g.__shomalLogs = [];

export function pushLog(entry: Omit<LogEntry, "id" | "at"> & { at?: string }) {
  const row: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: entry.at || new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    message: entry.message,
    meta: entry.meta,
  };
  g.__shomalLogs!.unshift(row);
  if (g.__shomalLogs!.length > MAX) g.__shomalLogs!.length = MAX;
  return row;
}

export function listLogs(limit = 100) {
  return (g.__shomalLogs || []).slice(0, limit);
}
