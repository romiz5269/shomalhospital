import { authFetch } from "./auth-client";
import type { UserPublic } from "./types";

export type AdminUserList = {
  total: number;
  page: number;
  page_size: number;
  items: UserPublic[];
};

export async function listAdminUsers(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  is_verified?: boolean;
  is_active?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.page_size) sp.set("page_size", String(params.page_size));
  if (params?.q) sp.set("q", params.q);
  if (params?.is_verified !== undefined) sp.set("is_verified", String(params.is_verified));
  if (params?.is_active !== undefined) sp.set("is_active", String(params.is_active));
  const qs = sp.toString();
  return authFetch<AdminUserList>(`/admin/users${qs ? `?${qs}` : ""}`);
}

export async function patchAdminUser(
  userId: string,
  payload: {
    is_verified?: boolean;
    is_active?: boolean;
    first_name?: string;
    last_name?: string;
    role?: "patient" | "cms" | "admin" | "doctor";
  },
) {
  return authFetch<UserPublic>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function softDeleteAdminUser(userId: string) {
  return authFetch<{ message: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function hardDeleteAdminUser(userId: string) {
  return authFetch<{ message: string }>(`/admin/users/${userId}/hard?confirm=true`, {
    method: "DELETE",
  });
}

export type OpsHealth = {
  ok: boolean;
  checked_at: string;
  gateway?: { status: string };
  services: { id: string; ok: boolean; status: number; latency_ms: number }[];
  traffic?: {
    window_seconds: number;
    requests: number;
    by_status: Record<string, number>;
    avg_duration_ms: number;
  };
};

export type OpsLogs = {
  logs: {
    id: string;
    at: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    requestId?: string;
    userId?: string;
  }[];
  traffic: OpsHealth["traffic"];
  traffic_5m?: OpsHealth["traffic"];
};

export async function fetchOpsHealth(token: string): Promise<OpsHealth> {
  const base = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080/api/v1";
  const res = await fetch(`${base}/ops/health`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load ops health");
  return res.json();
}

export async function fetchOpsLogs(token: string, limit = 100): Promise<OpsLogs> {
  const base = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080/api/v1";
  const res = await fetch(`${base}/ops/logs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load ops logs");
  return res.json();
}
