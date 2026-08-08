import { API } from "./config";
import { getAccessToken } from "./auth-client";
import { parseApiError } from "./types";

export type InsuranceAdmin = {
  id: string;
  code: string;
  name_fa: string;
  name_en?: string | null;
  description_fa?: string | null;
  description_en?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  phone?: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
};

const base = () => API.insurance.replace(/\/$/, "");

async function insuranceAdminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("NOT_AUTHENTICATED");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, { ...init, headers });
  } catch {
    throw new Error("INSURANCE_NETWORK_ERROR");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseApiError(data, `Insurance error (${res.status})`));
  return data as T;
}

export async function listAdminInsurances() {
  return insuranceAdminFetch<InsuranceAdmin[]>("/?include_inactive=true");
}

export async function upsertInsurance(payload: {
  code: string;
  name_fa: string;
  name_en?: string;
  description_fa?: string;
  logo_url?: string;
  website_url?: string;
  phone?: string;
  sort_order?: number;
  is_active?: boolean;
  is_featured?: boolean;
}) {
  return insuranceAdminFetch<InsuranceAdmin>("/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchInsurance(
  id: string,
  payload: Partial<{
    name_fa: string;
    name_en: string;
    description_fa: string;
    logo_url: string;
    website_url: string;
    phone: string;
    sort_order: number;
    is_active: boolean;
    is_featured: boolean;
  }>,
) {
  return insuranceAdminFetch<InsuranceAdmin>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function softDeleteInsurance(id: string) {
  return insuranceAdminFetch<{ message: string }>(`/${id}`, { method: "DELETE" });
}
