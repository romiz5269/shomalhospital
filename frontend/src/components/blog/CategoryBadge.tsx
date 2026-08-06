import clsx from "clsx";
import { categoryMeta, normalizeCategory } from "@/lib/blog-utils";

type Props = {
  category?: string | null;
  locale: string;
  size?: "sm" | "md";
  onDark?: boolean;
};

export default function CategoryBadge({ category, locale, size = "sm", onDark = false }: Props) {
  const cat = normalizeCategory(category);
  const { label, color } = categoryMeta(cat, locale);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        size === "sm" ? "px-2.5 py-0.5 text-[10px] uppercase" : "px-3 py-1 text-xs",
        onDark ? "bg-white/20 text-white backdrop-blur-sm" : color,
      )}
    >
      {label}
    </span>
  );
}
