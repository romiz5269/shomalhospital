import { API } from "./config";
import type { AppointmentListResponse, AppointmentOut } from "./types";
import { gatewayFetch } from "./auth-client";

export async function fetchMyAppointments(page = 1, pageSize = 20) {
  return gatewayFetch<AppointmentListResponse>(
    `/appointment/me?page=${page}&page_size=${pageSize}`,
  );
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
