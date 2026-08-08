const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("staff_token");
}

export function setToken(token: string) {
  localStorage.setItem("staff_token", token);
}

export function removeToken() {
  localStorage.removeItem("staff_token");
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
  register: (data: {
    name: string;
    email: string;
    password: string;
    department: string;
    phone: string;
  }) => apiFetch("/api/staff-auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch("/api/staff-auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: () => apiFetch("/api/staff-auth/me"),

  getTickets: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiFetch(`/api/staff/tickets${qs ? `?${qs}` : ""}`);
  },

  trackTicket: (ticketNumber: string) =>
    apiFetch(`/api/staff/tickets/track/${encodeURIComponent(ticketNumber)}`),

  getTicket: (id: string) => apiFetch(`/api/staff/tickets/${id}`),

  createTicket: (data: {
    subject: string;
    description: string;
    urgency: string;
    category: string;
  }) => apiFetch("/api/staff/tickets", { method: "POST", body: JSON.stringify(data) }),
};

export { API_URL };
