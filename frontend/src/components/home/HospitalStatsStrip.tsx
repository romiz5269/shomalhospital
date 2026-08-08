"use client";

import { useLocale } from "next-intl";

const STATS = {
  fa: [
    { value: "۹۵+", label: "پزشک متخصص و فوق‌تخصص" },
    { value: "۱۸۰", label: "تخت بستری فعال" },
    { value: "۲۵", label: "سال سابقه‌ی درمان" },
    { value: "۹۸٪", label: "رضایت بیماران" },
  ],
  en: [
    { value: "95+", label: "Specialist physicians" },
    { value: "180", label: "Active beds" },
    { value: "25", label: "Years of care" },
    { value: "98%", label: "Patient satisfaction" },
  ],
} as const;

/** Standalone stats strip — placed mid/lower page, never in hero. */
export default function HospitalStatsStrip() {
  const locale = useLocale();
  const items = locale === "en" ? STATS.en : STATS.fa;

  return (
    <section id="hospital-stats" className="section-shell-alt border-y border-shomal-border/60">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {items.map((s) => (
            <div key={s.label} className="text-center sm:text-start min-w-0">
              <p className="text-2xl sm:text-3xl font-bold text-shomal-primary tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs sm:text-sm text-muted font-semibold leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
