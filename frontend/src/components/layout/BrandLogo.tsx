"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const BRAND = {
  fa: { mark: "ش", name: "بیمارستان شمال", tagline: "SHOMAL HOSPITAL" },
  en: { mark: "S", name: "Shomal Hospital", tagline: "SPECIALTY CARE" },
} as const;

type Props = {
  compact?: boolean;
  onDark?: boolean;
};

export default function BrandLogo({ compact = false, onDark = false }: Props) {
  const locale = useLocale();
  const b = locale === "en" ? BRAND.en : BRAND.fa;

  const nameClass = onDark
    ? "font-bold text-white leading-tight"
    : "font-bold text-[#002a66] leading-tight";
  const tagClass = onDark
    ? "text-[10px] text-white/70 tracking-widest uppercase font-medium"
    : "text-[10px] text-[#3d5270] tracking-widest uppercase font-semibold";

  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 max-w-[70vw] group" aria-label={b.name}>
      <div
        className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#003b8e] text-white font-bold text-base sm:text-lg shadow-md ring-2 ring-[#003b8e]/20 group-hover:ring-[#003b8e]/40 transition-shadow shrink-0"
        aria-hidden
      >
        {b.mark}
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className={`${nameClass} text-[13px] sm:text-[15px] truncate`}>{b.name}</p>
        {!compact && <p className={`${tagClass} hidden sm:block`}>{b.tagline}</p>}
      </div>
    </Link>
  );
}
