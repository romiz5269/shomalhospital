"use client";

import { useLocale } from "next-intl";
import { BedDouble, Stethoscope, HeartPulse, Award } from "lucide-react";
import { cmsNumber, cmsText } from "@/lib/cms-utils";

const ICONS = {
  beds: BedDouble,
  doctors: Stethoscope,
  departments: HeartPulse,
  years: Award,
} as const;

type StatKey = keyof typeof ICONS;

const DEFAULTS = {
  fa: {
    title: "آمار بیمارستان شمال",
    label: "STATISTICS",
    beds: "تخت فعال",
    doctors: "پزشک متخصص",
    departments: "بخش درمانی",
    years: "سال تجربه",
  },
  en: {
    title: "Shomal Hospital at a Glance",
    label: "STATISTICS",
    beds: "Active Beds",
    doctors: "Specialists",
    departments: "Departments",
    years: "Years Experience",
  },
} as const;

type Props = {
  stats?: Record<string, unknown>;
};

export default function StatsBar({ stats: cmsStats }: Props) {
  const locale = useLocale();
  const d = locale === "en" ? DEFAULTS.en : DEFAULTS.fa;

  const title = cmsText(locale, cmsStats, "title", d.title);
  const subtitle = cmsText(locale, cmsStats, "subtitle", "");
  const sectionLabel = d.label;

  const items: { key: StatKey; value: number; suffix: string; label: string }[] = (
    ["beds", "doctors", "departments", "years"] as StatKey[]
  ).map((key) => ({
    key,
    value: cmsNumber(cmsStats, key, key === "years" ? 25 : key === "departments" ? 12 : key === "doctors" ? 95 : 180),
    suffix: key === "years" || key === "departments" ? "" : "+",
    label: cmsText(locale, cmsStats, `label_${key}`, d[key]),
  }));

  return (
    <section className="section-shell-alt">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 items-stretch">
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-shomal-accent font-semibold text-sm mb-3 tracking-wide">{sectionLabel}</p>
            <h2 className="heading-section mb-4 leading-tight">{title}</h2>
            {subtitle && <p className="text-muted leading-relaxed max-w-md text-sm sm:text-base">{subtitle}</p>}
            <div className="mt-6 sm:mt-8 h-1 w-24 gradient-shomal rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {items.map(({ key, value, suffix, label }) => {
              const Icon = ICONS[key];
              return (
                <div key={key} className="glass-card rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-7 min-w-0">
                  <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl gradient-shomal text-white shadow-md">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-2xl sm:text-4xl font-bold heading-section mb-1 tabular-nums">
                    {value}{suffix}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-muted leading-snug">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
