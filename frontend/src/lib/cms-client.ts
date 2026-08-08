import { API } from "./config";
import { getAccessToken } from "./auth-client";
import { parseApiError } from "./types";

export type HomepageBlock = {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  props: Record<string, unknown>;
};

export type PublicSite = {
  hospital_name_fa: string;
  hospital_name_en: string;
  hero_video_url: string | null;
  hero_poster_url: string | null;
  hero_title_fa: string;
  hero_title_en: string;
  hero_subtitle_fa: string | null;
  hero_subtitle_en: string | null;
  hero_badge_fa: string | null;
  hero_badge_en: string | null;
  phone: string | null;
  address_fa: string | null;
  address_en: string | null;
  homepage_blocks: HomepageBlock[];
};

export type DoctorOut = {
  id: string;
  name_fa: string;
  name_en: string | null;
  specialty_fa: string;
  specialty_en: string | null;
  department_code: string | null;
  image_url: string | null;
  bio_fa: string | null;
  bio_en: string | null;
  rating: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

export type PublicDoctorList = {
  total: number;
  items: DoctorOut[];
};

export type DoctorList = {
  total: number;
  page: number;
  page_size: number;
  items: DoctorOut[];
};

/** System console (port 2000) — full admin */
export function isSystemAdmin(user: {
  roles?: string[];
  permissions?: string[];
} | null): boolean {
  if (!user) return false;
  if (user.roles?.includes("admin")) return true;
  return (user.permissions ?? []).includes("auth:manage");
}

/** CMS / page builder — needs pages permissions (after approval for cms role) */
export function isSiteAdmin(user: {
  roles?: string[];
  permissions?: string[];
} | null): boolean {
  if (!user) return false;
  if (user.roles?.includes("admin") || user.roles?.includes("cms")) return true;
  const perms = new Set(user.permissions ?? []);
  return ["pages:manage", "pages:write", "blog:manage", "auth:manage"].some((p) =>
    perms.has(p),
  );
}

export function doctorDisplayName(locale: string, doc: DoctorOut) {
  return locale === "en" && doc.name_en ? doc.name_en : doc.name_fa;
}

export function doctorDisplaySpecialty(locale: string, doc: DoctorOut) {
  return locale === "en" && doc.specialty_en ? doc.specialty_en : doc.specialty_fa;
}

/** Rewrite /uploads/* to same-origin Next proxy so :4000 hero video always loads. */
function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("mixkit.co") || url.includes("assets.mixkit")) return null;
  const marker = "/uploads/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const name = url.slice(idx + marker.length).split("?")[0].replace(/^\/+/, "");
  if (!name) return url;
  return `/cms-media/uploads/${name}`;
}

export async function fetchPublicSite(): Promise<PublicSite | null> {
  try {
    const res = await fetch(`${API.blog}/public/site`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const site = (await res.json()) as PublicSite;
    site.hero_video_url = normalizeMediaUrl(site.hero_video_url);
    site.hero_poster_url = normalizeMediaUrl(site.hero_poster_url);
    return site;
  } catch {
    return null;
  }
}

export async function fetchPublicDoctors(params?: {
  featured?: boolean;
  department_code?: string;
}): Promise<PublicDoctorList> {
  const qs = new URLSearchParams();
  if (params?.featured != null) qs.set("featured", String(params.featured));
  if (params?.department_code) qs.set("department_code", params.department_code);
  const res = await fetch(`${API.blog}/public/doctors?${qs}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error("Failed to load doctors");
  return res.json();
}

async function cmsAdminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("NOT_AUTHENTICATED");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API.cmsAdmin}${path}`, { ...init, headers });
  } catch {
    throw new Error("CMS_NETWORK_ERROR");
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("CMS_UNAUTHORIZED");
  if (!res.ok) throw new Error(parseApiError(data, `CMS error (${res.status})`));
  return data as T;
}

export async function fetchAdminSite() {
  return cmsAdminFetch<PublicSite>("/admin/site");
}

export async function updateAdminSite(payload: Partial<PublicSite>) {
  return cmsAdminFetch<PublicSite>("/admin/site", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateHomepageBlocks(blocks: HomepageBlock[]) {
  return cmsAdminFetch<PublicSite>("/admin/site/blocks", {
    method: "PUT",
    body: JSON.stringify({ blocks }),
  });
}

export async function fetchAdminDoctors(params?: {
  page?: number;
  q?: string;
  department_code?: string;
}) {
  const sp = new URLSearchParams({
    page: String(params?.page ?? 1),
    page_size: "50",
  });
  if (params?.q) sp.set("q", params.q);
  if (params?.department_code) sp.set("department_code", params.department_code);
  return cmsAdminFetch<DoctorList>(`/admin/doctors?${sp}`);
}

export async function createDoctor(payload: {
  name_fa: string;
  name_en?: string;
  specialty_fa: string;
  specialty_en?: string;
  department_code?: string;
  image_url?: string;
  bio_fa?: string;
  bio_en?: string;
  rating?: number;
  is_featured?: boolean;
  sort_order?: number;
}) {
  return cmsAdminFetch<DoctorOut>("/admin/doctors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDoctor(
  id: string,
  payload: Partial<{
    name_fa: string;
    name_en: string;
    specialty_fa: string;
    specialty_en: string;
    department_code: string;
    image_url: string;
    bio_fa: string;
    bio_en: string;
    rating: number;
    is_featured: boolean;
    is_active: boolean;
    sort_order: number;
  }>,
) {
  return cmsAdminFetch<DoctorOut>(`/admin/doctors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDoctor(id: string) {
  return cmsAdminFetch<{ message: string }>(`/admin/doctors/${id}`, {
    method: "DELETE",
  });
}

export async function uploadCmsMedia(file: File) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API.cmsAdmin}/admin/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseApiError(data, `Upload failed (${res.status})`));
  return data as { url: string; media_type: string; filename: string };
}
