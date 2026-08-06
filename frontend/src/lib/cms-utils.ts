export function cmsText(
  locale: string,
  props: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  if (!props) return fallback;
  const fa = props[`${key}_fa`];
  const en = props[`${key}_en`];
  if (locale === "en") {
    if (typeof en === "string" && en.trim()) return en;
    return fallback;
  }
  if (typeof fa === "string" && fa.trim()) return fa;
  return fallback;
}

export function cmsNumber(
  props: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const v = props?.[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}
