import { API, TOKEN_KEYS } from "./config";
import type { AuthResponse, UserPublic } from "./types";
import { parseApiError } from "./types";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.access);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

export async function authFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API.auth}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(parseApiError(data, `Request failed (${res.status})`));
  }
  return data as T;
}

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const base = API.gateway.replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(parseApiError(data, `Request failed (${res.status})`));
  }
  return data as T;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits;
}

async function authRequest<T>(
  path: string,
  init: RequestInit,
  fallbackError: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API.auth}${path}`, init);
  } catch {
    throw new Error("NETWORK_ERROR");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseApiError(data, fallbackError));
  return data as T;
}

export async function loginPassword(phone: string, password: string) {
  return authRequest<AuthResponse>(
    "/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone), password }),
    },
    "Login failed",
  );
}

export async function requestOtp(phone: string, purpose: "login" | "signup" | "verify") {
  const res = await fetch(`${API.auth}/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, "OTP request failed"));
  return data as { message: string; otp_code?: string };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "login" | "signup" | "verify",
) {
  const res = await fetch(`${API.auth}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, "OTP verification failed"));
  return data as AuthResponse;
}

export async function signup(payload: {
  phone: string;
  password: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}) {
  const res = await fetch(`${API.auth}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, role: "patient" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, "Signup failed"));
  return data as AuthResponse & {
    success: boolean;
    message: string;
    auto_login?: boolean;
    otp_code?: string;
  };
}

export async function fetchMe(): Promise<UserPublic> {
  return authFetch<UserPublic>("/me");
}

export async function logoutApi() {
  const refresh = getRefreshToken();
  try {
    await authFetch("/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    /* ignore */
  }
  clearTokens();
}

export function applyAuthResponse(res: AuthResponse) {
  saveTokens(res.tokens.access_token, res.tokens.refresh_token);
  return res.user;
}
