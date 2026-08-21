const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
const API_BASE_KEY = "pm_api_base";

export function getApiBase(): string {
  const fallback = DEFAULT_API_BASE.replace(/\/$/, "");
  if (typeof window === "undefined") return fallback;
  const stored = (localStorage.getItem(API_BASE_KEY) || "").replace(/\/$/, "");
  const host = window.location.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (local) {
    if (stored.includes("localhost") || stored.includes("127.0.0.1")) return stored;
    return fallback;
  }
  if (stored) return stored;
  return fallback;
}

export function setApiBase(url: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(API_BASE_KEY, url.replace(/\/$/, ""));
  }
}

const TOKEN_KEY = "pm_token";
const TOKEN_EXP_KEY = "pm_token_exp";
const MUST_CHANGE_KEY = "pm_must_change";

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("ارتباط با سرور برقرار نشد. لطفاً backend را بررسی کنید.");
  }
}

function parseErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((e) => {
      if (typeof e === "object" && e !== null && "msg" in e) {
        const field = "loc" in e && Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : "";
        const fa: Record<string, string> = {
          username: "نام کاربری",
          email: "ایمیل",
          password: "رمز عبور",
          full_name: "نام کامل",
        };
        const label = fa[String(field)] || String(field);
        return `${label}: ${e.msg}`;
      }
      return String(e);
    });
    return msgs.join(" · ");
  }
  return "خطا در ارتباط با سرور";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const exp = localStorage.getItem(TOKEN_EXP_KEY);
  if (exp && Date.now() >= Number(exp)) {
    clearToken();
    return null;
  }
  return token;
}

export function isTokenValid(): boolean {
  return getToken() !== null;
}

export function setToken(token: string, expiresIn?: number) {
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresIn) {
    localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
  localStorage.removeItem(MUST_CHANGE_KEY);
}

export function setMustChangePassword(v: boolean) {
  if (v) localStorage.setItem(MUST_CHANGE_KEY, "1");
  else localStorage.removeItem(MUST_CHANGE_KEY);
}

export function mustChangePassword(): boolean {
  return localStorage.getItem(MUST_CHANGE_KEY) === "1";
}

export async function forceRefreshSession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await safeFetch(`${getApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.access_token, data.expires_in);
    return true;
  } catch {
    return false;
  }
}

export function getSessionExpiry(): Date | null {
  const exp = localStorage.getItem(TOKEN_EXP_KEY);
  return exp ? new Date(Number(exp)) : null;
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshSessionIfNeeded(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const exp = localStorage.getItem(TOKEN_EXP_KEY);
  if (!exp) return true;
  const msLeft = Number(exp) - Date.now();
  // تمدید اگر کمتر از ۲۴ ساعت مانده
  if (msLeft > 24 * 60 * 60 * 1000) return true;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await safeFetch(`${getApiBase()}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.access_token, data.expires_in);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const res = await safeFetch(`${getApiBase()}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "خطا" }));
    throw new Error(parseErrorDetail(err.detail));
  }
  return res.json();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await safeFetch(`${getApiBase()}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshed = await refreshSessionIfNeeded();
    if (refreshed && getToken()) {
      return request(path, options);
    }
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("نشست شما منقضی شده — لطفاً دوباره وارد شوید");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "خطا در ارتباط با سرور" }));
    throw new Error(parseErrorDetail(err.detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function fetchToken(username: string, password: string, remember: boolean) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  body.set("grant_type", "password");
  if (remember) body.set("scope", "remember");

  const res = await safeFetch(`${getApiBase()}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("تعداد تلاش ورود زیاد است. حدود یک دقیقه صبر کنید و دوباره وارد شوید.");
    }
    const err = await res.json().catch(() => ({ detail: "نام کاربری یا رمز عبور اشتباه است" }));
    throw new Error(parseErrorDetail(err.detail) || "نام کاربری یا رمز عبور اشتباه است");
  }
  return res.json() as Promise<{ access_token: string; expires_in: number; must_change_password?: boolean }>;
}

export const api = {
  login: async (username: string, password: string, remember = false) => {
    const data = await fetchToken(username, password, remember);
    setToken(data.access_token, data.expires_in);
    setMustChangePassword(!!data.must_change_password);
    return data;
  },

  forgotPassword: (username: string) =>
    publicRequest<{ ok: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  setNewPassword: async (new_password: string) => {
    const data = await request<{ access_token: string; expires_in: number; must_change_password?: boolean }>("/auth/set-new-password", {
      method: "POST",
      body: JSON.stringify({ new_password }),
    });
    setToken(data.access_token, data.expires_in);
    setMustChangePassword(false);
    return data;
  },

  passwordResetRequests: {
    list: (status = "pending") =>
      request<PasswordResetRequestItem[]>(`/auth/password-reset-requests?status_filter=${encodeURIComponent(status)}`),
    approve: (id: number) =>
      request<{ ok: boolean; message: string; reset_code?: string }>(`/auth/password-reset-requests/${id}/approve`, { method: "POST" }),
    reject: (id: number) =>
      request<{ ok: boolean }>(`/auth/password-reset-requests/${id}/reject`, { method: "POST" }),
  },

  approveUserPasswordReset: (userId: number) =>
    request<{ ok: boolean; message: string; reset_code?: string }>(`/auth/users/${userId}/approve-password-reset`, { method: "POST" }),

  changePassword: async (current_password: string, new_password: string) => {
    const data = await request<{ access_token: string; expires_in: number }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
    setToken(data.access_token, data.expires_in);
    setMustChangePassword(false);
    return data;
  },

  resetUserPassword: (userId: number, new_password: string) =>
    request<{ ok: boolean; message: string }>(`/auth/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),

  me: () => request<UserProfile>("/auth/me"),

  updateProfile: async (data: { full_name?: string; username?: string }) => {
    const updated = await request<UserProfile & { access_token?: string; expires_in?: number }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (updated.access_token) setToken(updated.access_token, updated.expires_in);
    return updated;
  },

  dashboard: () => request<DashboardStats>("/dashboard"),

  systemInfo: () => request<SystemInfo>("/system/info"),

  networkScan: () => request<{ interfaces: NetworkInterface[] }>("/system/network-scan"),

  setNetworkMode: (mode: "local" | "network", ip?: string) =>
    request<NetworkModeResult>("/system/set-network-mode", {
      method: "POST",
      body: JSON.stringify({ mode, ip }),
    }),

  assetCategories: {
    list: () => request<{ id: string; label: string }[]>("/system/asset-categories"),
    update: (items: { id: string; label: string }[]) =>
      request<{ id: string; label: string }[]>("/system/asset-categories", {
        method: "PUT",
        body: JSON.stringify(items),
      }),
  },

  users: {
    list: () => request<UserProfile[]>("/users/"),
    create: (data: { username: string; email: string; full_name: string; password: string; role?: string }) =>
      request<UserProfile>("/users/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<UserProfile & { is_active: boolean; role: string; username: string }>) =>
      request<UserProfile>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
  },

  departments: {
    list: () => request<Department[]>("/departments/"),
    create: (data: Partial<Department>) => request<Department>("/departments/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Department>) => request<Department>(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/departments/${id}`, { method: "DELETE" }),
  },

  assets: {
    list: (params?: { department_id?: number; asset_type?: string }) => {
      const q = new URLSearchParams();
      if (params?.department_id) q.set("department_id", String(params.department_id));
      if (params?.asset_type) q.set("asset_type", params.asset_type);
      const qs = q.toString();
      return request<Asset[]>(`/assets/${qs ? `?${qs}` : ""}`);
    },
    create: (data: Partial<Asset>) => request<Asset>("/assets/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Asset>) => request<Asset>(`/assets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/assets/${id}`, { method: "DELETE" }),
    importPreview: async (file: File) => {
      const token = getToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await safeFetch(`${getApiBase()}/assets/import/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("خطا در خواندن فایل");
      return res.json() as Promise<{ preview: Record<string, string>[]; total: number; errors: string[] }>;
    },
    importConfirm: (rows: Record<string, string>[]) =>
      request<{ created: number }>("/assets/import/confirm", { method: "POST", body: JSON.stringify({ rows }) }),
    listUpgrades: (assetId: number) => request<AssetUpgrade[]>(`/assets/${assetId}/upgrades`),
    createUpgrade: (assetId: number, data: Partial<AssetUpgrade>) =>
      request<AssetUpgrade>(`/assets/${assetId}/upgrades`, { method: "POST", body: JSON.stringify(data) }),
    deleteUpgrade: (assetId: number, upgradeId: number) =>
      request<void>(`/assets/${assetId}/upgrades/${upgradeId}`, { method: "DELETE" }),
    uploadImage: async (assetId: number, file: File) => {
      const token = getToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await safeFetch(`${getApiBase()}/assets/${assetId}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "خطا در آپلود عکس" }));
        throw new Error(parseErrorDetail(err.detail));
      }
      return res.json() as Promise<AssetImage>;
    },
    deleteImage: (assetId: number, imageId: number) =>
      request<void>(`/assets/${assetId}/images/${imageId}`, { method: "DELETE" }),
  },

  itOverview: {
    get: () => request<ITOverview>("/it-overview/"),
    updateInfrastructure: (infrastructure: InfraStatusItem[]) =>
      request<InfraStatusItem[]>("/it-overview/infrastructure", {
        method: "PUT",
        body: JSON.stringify({ infrastructure }),
      }),
  },

  workCases: {
    list: () => request<WorkCase[]>("/work-cases/"),
    create: (data: Partial<WorkCase>) => request<WorkCase>("/work-cases/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<WorkCase>) => request<WorkCase>(`/work-cases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/work-cases/${id}`, { method: "DELETE" }),
  },

  reminders: {
    list: () => request<Reminder[]>("/reminders/"),
    resolve: (id: number) => request<Reminder>(`/reminders/${id}/resolve`, { method: "POST" }),
    create: (data: Partial<Reminder>) => request<Reminder>("/reminders/", { method: "POST", body: JSON.stringify(data) }),
    testNotification: () =>
      request<{ ok: boolean; message: string; due_at: string }>("/reminders/test-notification", { method: "POST" }),
    delete: (id: number) => request<void>(`/reminders/${id}`, { method: "DELETE" }),
  },

  push: {
    vapidKey: () => request<{ public_key: string }>("/push/vapid-public-key"),
    subscribe: (endpoint: string, keys: { p256dh: string; auth: string }) =>
      request<{ ok: boolean }>("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint, keys }),
      }),
    notifyDue: () => request<{ sent: number }>("/push/notify-due", { method: "POST" }),
  },

  maintenancePlans: {
    list: () => request<MaintenancePlan[]>("/maintenance-plans/"),
    create: (data: Partial<MaintenancePlan>) => request<MaintenancePlan>("/maintenance-plans/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<MaintenancePlan>) => request<MaintenancePlan>(`/maintenance-plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    complete: (id: number) => request<MaintenancePlan>(`/maintenance-plans/${id}/complete`, { method: "POST" }),
    delete: (id: number) => request<void>(`/maintenance-plans/${id}`, { method: "DELETE" }),
  },

  pmVisits: {
    list: (params?: { asset_id?: number; department_id?: number; work_type?: string }) => {
      const q = new URLSearchParams();
      if (params?.asset_id) q.set("asset_id", String(params.asset_id));
      if (params?.department_id) q.set("department_id", String(params.department_id));
      if (params?.work_type) q.set("work_type", params.work_type);
      const qs = q.toString();
      return request<PMVisit[]>(`/pm-visits/${qs ? `?${qs}` : ""}`);
    },
    templates: (category?: string, allCategories?: boolean) => {
      const q = new URLSearchParams();
      if (category) q.set("category", category);
      if (allCategories) q.set("all_categories", "true");
      const qs = q.toString();
      return request<PMChecklistTemplate[]>(`/pm-visits/checklist-templates${qs ? `?${qs}` : ""}`);
    },
    createTemplate: (data: { name: string; category: string; interval_days?: number; sort_order?: number }) =>
      request<PMChecklistTemplate>("/pm-visits/checklist-templates", { method: "POST", body: JSON.stringify(data) }),
    updateTemplate: (id: number, data: Partial<PMChecklistTemplate>) =>
      request<PMChecklistTemplate>(`/pm-visits/checklist-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteTemplate: (id: number) => request<void>(`/pm-visits/checklist-templates/${id}`, { method: "DELETE" }),
    create: (data: Partial<PMVisit> & { tasks?: PMVisitTask[] }) =>
      request<PMVisit>("/pm-visits/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<PMVisit> & { tasks?: PMVisitTask[] }) =>
      request<PMVisit>(`/pm-visits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/pm-visits/${id}`, { method: "DELETE" }),
  },

  inventory: {
    list: (status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return request<InventoryItem[]>(`/inventory/${qs}`);
    },
    create: (data: Partial<InventoryItem>) =>
      request<InventoryItem>("/inventory/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<InventoryItem>) =>
      request<InventoryItem>(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/inventory/${id}`, { method: "DELETE" }),
  },

  activity: () => request<ActivityLog[]>("/activity/"),

  attachments: {
    list: (entity_type: string, entity_id: number) =>
      request<AttachmentMeta[]>(`/attachments/?entity_type=${entity_type}&entity_id=${entity_id}`),
    upload: async (entity_type: string, entity_id: number, file: File) => {
      const token = getToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await safeFetch(`${getApiBase()}/attachments/?entity_type=${encodeURIComponent(entity_type)}&entity_id=${entity_id}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (res.status === 401) {
        clearToken();
        throw new Error("نشست منقضی شده — دوباره وارد شوید");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "خطا در آپلود" }));
        throw new Error(parseErrorDetail(err.detail));
      }
      return res.json();
    },
    download: async (id: number, filename: string) => {
      const token = getToken();
      const res = await safeFetch(`${getApiBase()}/attachments/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("خطا در دانلود");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    delete: (id: number) => request<void>(`/attachments/${id}`, { method: "DELETE" }),
  },

  search: (q: string) => request<SearchResult>(`/search/?q=${encodeURIComponent(q)}`),

  exportReport: async (reportType: string) => {
    const token = getToken();
    const res = await safeFetch(`${getApiBase()}/reports/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ report_type: reportType, format: "xlsx" }),
    });
    if (!res.ok) throw new Error("خطا در تولید گزارش");
    return res.blob();
  },
};

export interface DashboardStats {
  total_assets: number;
  total_departments: number;
  total_pm_visits: number;
  critical_alerts: number;
  warning_alerts: number;
  ok_alerts: number;
  overdue_pm: number;
  inventory_pending: number;
  assets_by_type: Record<string, number>;
  compliance_rate: number;
  recent_pm_visits: PMVisit[];
  active_alerts: Reminder[];
  upcoming_pm: PMVisit[];
  recent_inventory?: InventoryItem[];
  repair_count?: number;
  replace_count?: number;
}

export interface SystemInfo {
  host: string;
  port: number;
  frontend_port: number;
  network_mode: string;
  network_ip?: string;
  local_ip: string;
  network_ips: string[];
  api_url: string;
  frontend_url: string;
}

export interface NetworkInterface {
  interface: string;
  ip: string;
  is_hospital_range: boolean;
}

export interface NetworkModeResult {
  ok: boolean;
  network_mode: string;
  network_ip: string;
  frontend_url: string;
  api_url: string;
}

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  role: string;
  email: string;
  is_active: boolean;
  must_change_password?: boolean;
  allow_passwordless_login?: boolean;
}

export interface PasswordResetRequestItem {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface AttachmentMeta {
  id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  floor?: string;
  description?: string;
}

export interface AssetHardware {
  mb?: string;
  cpu?: string;
  ram?: string;
  vga?: string;
  power?: string;
  hard?: string;
  monitor_name?: string;
  monitor_asset_code?: string;
  printer_name?: string;
  printer_asset_code?: string;
}

export interface AssetSoftware {
  os_name?: string;
  antivirus?: string;
  antivirus_status?: string;
  mail_user?: string;
  windows_key?: string;
}

export interface AssetImage {
  id: number;
  stored_name: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Asset {
  id: number;
  name: string;
  asset_type: string;
  serial_number?: string;
  ip_address?: string;
  mac_address?: string;
  os_name?: string;
  os_version?: string;
  windows_key?: string;
  windows_activated_at?: string;
  assigned_to?: string;
  location?: string;
  brand?: string;
  model?: string;
  toner_type?: string;
  notes?: string;
  purchase_date?: string;
  warranty_end_date?: string;
  vendor_name?: string;
  vendor_phone?: string;
  department_id?: number;
  asset_code?: string;
  hostname?: string;
  unit?: string;
  operational_status?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  monitor?: string;
  raid?: string;
  virtualization?: string;
  hypervisor?: string;
  rack?: string;
  power_info?: string;
  network_info?: string;
  services_info?: string;
  system_name_old?: string;
  user_name_id?: string;
  section_name?: string;
  section_id?: string;
  floor?: string;
  pm_date?: string;
  alert_status?: string;
  days_until_activation?: number;
  created_at?: string;
  updated_at?: string;
  last_received_date?: string;
  last_return_date?: string;
  next_service_date?: string;
  hardware?: AssetHardware;
  software?: AssetSoftware;
  images?: AssetImage[];
}

export interface AssetUpgrade {
  id: number;
  asset_id: number;
  title: string;
  component?: string;
  description?: string;
  upgraded_at: string;
  upgraded_by: string;
  created_at: string;
}

export interface InfraStatusItem {
  key: string;
  label: string;
  status: string;
  detail: string;
}

export interface ITOverview {
  systems_total: number;
  systems_healthy: number;
  systems_problem: number;
  systems_offline: number;
  servers_total: number;
  servers_healthy: number;
  servers_problem: number;
  network_total: number;
  network_healthy: number;
  open_issues: number;
  critical_issues: number;
  active_services: number;
  down_services: number;
  infrastructure: InfraStatusItem[];
  recent_events: {
    id: number;
    user_name: string;
    action: string;
    entity_type: string;
    details?: string;
    created_at: string;
  }[];
}

export interface WorkCase {
  id: number;
  title: string;
  description?: string;
  department_id?: number;
  asset_id?: number;
  performed_by: string;
  work_type: string;
  status: string;
  completed_at?: string;
  created_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminder_type: string;
  asset_id?: number;
  due_date: string;
  interval_days?: number;
  warning_days?: number;
  source?: string;
  status: string;
  is_resolved: boolean;
}

export interface MaintenancePlan {
  id: number;
  title: string;
  description?: string;
  asset_id?: number;
  department_id?: number;
  interval_days: number;
  next_due_date: string;
  last_performed_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export interface PMChecklistTemplate {
  id: number;
  name: string;
  category: string;
  interval_days?: number;
  sort_order: number;
}

export interface PMVisitTask {
  id?: number;
  task_name: string;
  is_done: boolean;
  notes?: string;
}

export interface PMVisit {
  id: number;
  visit_date: string;
  return_date?: string;
  next_pm_date?: string;
  recipient_name?: string;
  recipient_unit?: string;
  asset_id?: number;
  department_id?: number;
  performed_by: string;
  notes?: string;
  alert_title?: string;
  alert_description?: string;
  alert_warning_days?: number;
  work_type?: string;
  title?: string;
  created_at: string;
  tasks: PMVisitTask[];
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  serial_number?: string;
  quantity: number;
  received_date: string;
  installed_date?: string;
  department_id?: number;
  purpose?: string;
  status: string;
  notes?: string;
  asset_id?: number;
  created_at: string;
}

export interface SearchResult {
  assets: { id: number; name: string; type: string; serial?: string }[];
  pm_visits: { id: number; label: string; unit: string; asset_name: string }[];
  inventory: { id: number; name: string; status: string; category: string }[];
  reminders: { id: number; title: string; status: string }[];
}
