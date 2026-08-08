const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function removeToken() {
  localStorage.removeItem("admin_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || "خطای سرور");
  }
  return json;
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: () => apiFetch("/api/auth/me"),

  getStats: () => apiFetch("/api/tickets/stats"),

  getTickets: (params?: { status?: string; urgency?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.urgency) query.set("urgency", params.urgency);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return apiFetch(`/api/tickets${qs ? `?${qs}` : ""}`);
  },

  getTicket: (id: string) => apiFetch(`/api/tickets/${id}`),

  updateStatus: (id: string, status: string) =>
    apiFetch(`/api/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  reply: (id: string, message: string) =>
    apiFetch(`/api/tickets/${id}/replies`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  deleteTicket: (id: string) =>
    apiFetch(`/api/tickets/${id}`, { method: "DELETE" }),
};
