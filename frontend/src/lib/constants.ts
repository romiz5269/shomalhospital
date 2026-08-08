export const URGENCY_OPTIONS = [
  { value: "LOW", label: "پایین", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  { value: "MEDIUM", label: "متوسط", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900" },
  { value: "HIGH", label: "بالا", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900" },
  { value: "CRITICAL", label: "اضطراری", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "IT", label: "فناوری اطلاعات" },
  { value: "MEDICAL_EQUIPMENT", label: "تجهیزات پزشکی" },
  { value: "FACILITIES", label: "تاسیسات و ساختمان" },
  { value: "HR", label: "منابع انسانی" },
  { value: "PHARMACY", label: "داروخانه" },
  { value: "OTHER", label: "سایر" },
] as const;

export const STATUS_OPTIONS = [
  { value: "OPEN", label: "باز", color: "bg-emerald-100 text-emerald-700" },
  { value: "IN_PROGRESS", label: "در حال بررسی", color: "bg-blue-100 text-blue-700" },
  { value: "RESOLVED", label: "حل شده", color: "bg-violet-100 text-violet-700" },
  { value: "CLOSED", label: "بسته", color: "bg-slate-100 text-slate-600" },
] as const;

export type Urgency = (typeof URGENCY_OPTIONS)[number]["value"];
export type Category = (typeof CATEGORY_OPTIONS)[number]["value"];
export type Status = (typeof STATUS_OPTIONS)[number]["value"];

export function getUrgencyLabel(value: string) {
  return URGENCY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getUrgencyColor(value: string) {
  return URGENCY_OPTIONS.find((o) => o.value === value)?.color ?? "bg-slate-100 text-slate-700";
}

export function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getStatusLabel(value: string) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getStatusColor(value: string) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.color ?? "bg-slate-100 text-slate-700";
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
