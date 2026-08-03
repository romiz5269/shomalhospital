export interface RequestContext {
  // Request
  requestId: string;
  traceId: string;
  startedAt: number;

  // HTTP
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  language?: string;

  // Authentication
  userId?: string;
  sessionId?: string;

  // Authorization
  role?: string;
  permissions?: string[];

  // Multi Tenant (برای آینده)
  tenantId?: string;
}
