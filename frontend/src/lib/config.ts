export const API = {
  gateway:
    process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080/api/v1",
  auth:
    process.env.NEXT_PUBLIC_AUTH_URL ??
    "http://127.0.0.1:8080/api/v1/auth",
  insurance:
    process.env.NEXT_PUBLIC_INSURANCE_URL ?? "http://127.0.0.1:5004",
  blog: process.env.NEXT_PUBLIC_BLOG_URL ?? "http://127.0.0.1:5005",
  /** CMS admin — via gateway (preferred) or direct blog-service */
  cmsAdmin:
    process.env.NEXT_PUBLIC_CMS_ADMIN_URL ??
    `${process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://127.0.0.1:8080/api/v1"}/pages`,
  appointment:
    process.env.NEXT_PUBLIC_APPOINTMENT_URL ??
    "http://127.0.0.1:8080/api/v1/appointment",
};

/** Legacy stock fallback only — homepage HeroSection must NOT use this when CMS has a video. */
export const HERO_VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "";

export const HERO_POSTER =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80";

export const DEPARTMENTS = [
  { code: "ER", nameFa: "اورژانس", nameEn: "Emergency" },
  { code: "INT", nameFa: "داخلی", nameEn: "Internal Medicine" },
  { code: "SUR", nameFa: "جراحی", nameEn: "Surgery" },
  { code: "PED", nameFa: "اطفال", nameEn: "Pediatrics" },
  { code: "OBG", nameFa: "زنان و زایمان", nameEn: "Obstetrics & Gynecology" },
  { code: "CRD", nameFa: "قلب و عروق", nameEn: "Cardiology" },
  { code: "RAD", nameFa: "رادیولوژی", nameEn: "Radiology" },
  { code: "LAB", nameFa: "آزمایشگاه", nameEn: "Laboratory" },
  { code: "OPD", nameFa: "درمانگاه سرپایی", nameEn: "Outpatient" },
  { code: "ICU", nameFa: "مراقبت‌های ویژه", nameEn: "ICU" },
] as const;

export const TOKEN_KEYS = {
  access: "shomal_access_token",
  refresh: "shomal_refresh_token",
} as const;
