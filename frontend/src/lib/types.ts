export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
};

export type UserPublic = {
  id: string;
  phone: string;
  national_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  groups: string[];
  doctor_profile_id?: string | null;
};

export type AuthResponse = {
  user: UserPublic;
  tokens: TokenPair;
  auto_login?: boolean;
};

export type AppointmentOut = {
  id: string;
  patient_auth_user_id: string;
  patient_phone?: string | null;
  patient_name?: string | null;
  doctor_auth_user_id?: string | null;
  doctor_id?: string | null;
  doctor_name?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  scheduled_at: string;
  duration_min: number;
  status: string;
  notes?: string | null;
  reason?: string | null;
  is_active: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentListResponse = {
  total: number;
  page: number;
  page_size: number;
  items: AppointmentOut[];
};

export type ApiError = {
  detail?: string | { msg: string }[];
  message?: string;
};

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const err = data as ApiError;
  if (typeof err.detail === "string") return err.detail;
  if (typeof err.message === "string") return err.message;
  if (Array.isArray(err.detail) && err.detail[0]?.msg) return err.detail[0].msg;
  return fallback;
}
