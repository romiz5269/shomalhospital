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

/** Convert Persian/Arabic digits and normalize IR mobile to 09xxxxxxxxx */
export function normalizePhone(phone: string): string {
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  const latin = phone.replace(/[۰-۹٠-٩]/g, (ch) => map[ch] ?? ch);
  const digits = latin.replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits;
}

export function assertIranMobile(phone: string): string {
  const n = normalizePhone(phone);
  if (!/^09\d{9}$/.test(n)) {
    throw new Error("شماره موبایل را کامل وارد کنید (مثلاً 09123456789).");
  }
  return n;
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
  const normalized = assertIranMobile(phone);
  return authRequest<AuthResponse>(
    "/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, password }),
    },
    "Login failed",
  );
}

export async function requestOtp(phone: string, purpose: "login" | "signup" | "verify") {
  const res = await fetch(`${API.auth}/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: assertIranMobile(phone), purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, "OTP request failed"));
  return data as { message: string; otp_code?: string };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "login" | "signup" | "verify",
): Promise<AuthResponse | { pending_approval: true; message: string }> {
  const res = await fetch(`${API.auth}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: assertIranMobile(phone), code: code.trim(), purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, "OTP verification failed"));
  if (
    purpose === "signup" &&
    data?.message === "PENDING_ADMIN_APPROVAL" &&
    !data?.tokens
  ) {
    return { pending_approval: true, message: data.message as string };
  }
  return data as AuthResponse;
}

export async function signup(payload: {
  phone: string;
  password: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  panel?: "patient" | "console" | "cms";
  role?: string;
}) {
  const panel = payload.panel ?? "patient";
  const role = panel === "patient" ? payload.role ?? "patient" : undefined;
  const res = await fetch(`${API.auth}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: assertIranMobile(payload.phone),
      password: payload.password,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      panel,
      ...(role ? { role } : {}),
    }),
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
