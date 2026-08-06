export type BlogCategory = "news" | "blog" | "event" | "education" | "health" | "all";

export function normalizeCategory(raw?: string | null): BlogCategory {
  const c = (raw ?? "blog").toLowerCase();
  if (c.includes("news")) return "news";
  if (c.includes("event")) return "event";
  if (c.includes("education")) return "education";
  if (c.includes("health")) return "health";
  if (c.includes("blog")) return "blog";
  return "blog";
}

export function categoryMatchesTab(category: BlogCategory, tab: BlogCategory): boolean {
  if (tab === "all") return true;
  if (tab === "news") return category === "news" || category === "health";
  return category === tab;
}

const META = {
  news: { labelFa: "اخبار", labelEn: "News", color: "bg-[#003b8e] text-white" },
  blog: { labelFa: "وبلاگ", labelEn: "Blog", color: "bg-[#1a56b8]/15 text-[#003b8e]" },
  event: { labelFa: "رویداد", labelEn: "Event", color: "bg-amber-100 text-amber-800" },
  education: { labelFa: "آموزش", labelEn: "Education", color: "bg-violet-100 text-violet-800" },
  health: { labelFa: "سلامت", labelEn: "Health", color: "bg-emerald-100 text-emerald-800" },
  all: { labelFa: "همه", labelEn: "All", color: "bg-gray-100 text-gray-700" },
} as const;

export function categoryMeta(category: BlogCategory, locale: string) {
  const m = META[category] ?? META.blog;
  return {
    label: locale === "en" ? m.labelEn : m.labelFa,
    color: m.color,
  };
}

export function formatBlogDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export const BLOG_TABS: BlogCategory[] = ["all", "news", "blog", "event", "education"];

export const TAB_LABELS: Record<BlogCategory, { fa: string; en: string }> = {
  all: { fa: "همه", en: "All" },
  news: { fa: "اخبار", en: "News" },
  blog: { fa: "وبلاگ", en: "Blog" },
  event: { fa: "رویداد", en: "Events" },
  education: { fa: "آموزش", en: "Education" },
  health: { fa: "سلامت", en: "Health" },
};
