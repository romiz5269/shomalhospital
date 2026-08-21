/** برچسب‌های ماژول عیب‌یابی و تعمیرات (نمایش UI — بدون PM انگلیسی) */
export const WORK_MODULE = {
  title: "عیب‌یابی و تعمیرات",
  short: "عیب‌یابی",
  subtitle: "تعمیرات دوره‌ای و عیب‌یابی موردی در یک کارتابل",
  excelSheet: "عیب‌یابی و تعمیرات",
} as const;

export function workTypeLabel(workType?: string): string {
  return workType === "adhoc" ? "موردی" : "دوره‌ای";
}
