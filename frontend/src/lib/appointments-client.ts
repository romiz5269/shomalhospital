import { gatewayFetch } from "./auth-client";
import type { AppointmentListResponse, AppointmentOut } from "./types";

export async function fetchMyAppointments(page = 1, pageSize = 20, status?: string) {
  const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) sp.set("status", status);
  return gatewayFetch<AppointmentListResponse>(`/appointment/me?${sp}`);
}

export async function bookAppointment(payload: {
  scheduled_at: string;
  department_code: string;
  department_name: string;
  doctor_id?: string;
  doctor_name?: string;
  reason?: string;
  notes?: string;
  duration_min?: number;
}) {
  return gatewayFetch<AppointmentOut>("/appointment/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelAppointment(id: string, notes?: string) {
  return gatewayFetch<AppointmentOut>(`/appointment/me/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled", notes }),
  });
}

export async function fetchAdminAppointments(params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  department_code?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.page_size) sp.set("page_size", String(params.page_size ?? 50));
  else sp.set("page_size", "50");
  if (params?.q) sp.set("q", params.q);
  if (params?.status) sp.set("status", params.status);
  if (params?.department_code) sp.set("department_code", params.department_code);
  return gatewayFetch<AppointmentListResponse>(`/appointment/?${sp}`);
}

export async function patchAdminAppointment(
  id: string,
  payload: { status?: string; notes?: string; reason?: string },
) {
  return gatewayFetch<AppointmentOut>(`/appointment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function softDeleteAdminAppointment(id: string) {
  return gatewayFetch<{ message: string }>(`/appointment/${id}`, {
    method: "DELETE",
  });
}
