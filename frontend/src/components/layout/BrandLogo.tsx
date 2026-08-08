"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const BRAND = {
  fa: { mark: "ش", name: "بیمارستان شمال", tagline: "فوق‌تخصصی · آمل" },
  en: { mark: "S", name: "Shomal Hospital", tagline: "Amol · Specialty Care" },
} as const;

type Props = {
  compact?: boolean;
  onDark?: boolean;
};

export default function BrandLogo({ compact = false, onDark = false }: Props) {
  const locale = useLocale();
  const b = locale === "en" ? BRAND.en : BRAND.fa;

  return (
    <Link
      href="/"
      className="flex items-center gap-2 shrink min-w-0 max-w-full group"
      aria-label={b.name}
    >
      <div
        className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-[#003b8e] text-white font-bold text-sm sm:text-lg shadow-md shrink-0"
        aria-hidden
      >
        {b.mark}
      </div>
      <div className="min-w-0 overflow-hidden">
        <p
          className={`font-bold leading-tight text-[12px] sm:text-[15px] truncate ${
            onDark ? "text-white" : "text-[#002a66]"
          }`}
        >
          {b.name}
        </p>
        {!compact && (
          <p
            className={`text-[10px] tracking-wide truncate ${
              onDark ? "text-white/65" : "text-[#5a7390]"
            }`}
          >
            {b.tagline}
          </p>
        )}
        {compact && (
          <p
            className={`text-[10px] tracking-wide truncate ${
              onDark ? "text-white/65" : "text-[#5a7390]"
            }`}
          >
            {locale === "en" ? "Amol" : "آمل"}
          </p>
        )}
      </div>
    </Link>
  );
}
