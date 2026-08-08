"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Calendar, ArrowLeft } from "lucide-react";
import {
  doctorDisplayName,
  doctorDisplaySpecialty,
  type DoctorOut,
} from "@/lib/cms-client";
import { cmsNumber, cmsText } from "@/lib/cms-utils";

type Props = {
  doctors?: DoctorOut[];
  blockProps?: Record<string, unknown>;
};

export default function PopularDoctors({ doctors, blockProps }: Props) {
  const t = useTranslations("doctors");
  const locale = useLocale();

  const title = cmsText(
    locale,
    blockProps,
    "title",
    locale === "en" ? "Featured physicians" : "پزشکان برجسته",
  );
  const subtitle = cmsText(
    locale,
    blockProps,
    "subtitle",
    locale === "en" ? "Our expert care team" : "تیم درمان",
  );
  const maxCount = cmsNumber(blockProps, "max_count", 6);
  const list = (doctors ?? []).slice(0, maxCount);

  if (list.length === 0) return null;

  return (
    <section id="doctors" className="section-shell-alt">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow mb-2">{subtitle}</p>
            <h2 className="heading-section">{title}</h2>
          </div>
          <Link href="/doctors" className="btn-outline self-start">
            {t("viewAll")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((doc) => (
            <article
              key={doc.id}
              className="group overflow-hidden rounded-2xl border border-shomal-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-white/5"
            >
              <div className="relative h-52 overflow-hidden sm:h-56">
                <Image
                  src={
                    doc.image_url ||
                    "https://ui-avatars.com/api/?name=DR&background=003B8E&color=fff&size=512"
                  }
                  alt={doctorDisplayName(locale, doc)}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width:1024px) 100vw, 33vw"
                />
              </div>
              <div className="p-5">
                <h3 className="heading-card text-lg mb-1">
                  {doctorDisplayName(locale, doc)}
                </h3>
                <p className="text-sm text-muted mb-4">
                  {doctorDisplaySpecialty(locale, doc)}
                </p>
                <Link
                  href={`/appointments?dept=${doc.department_code || "OPD"}&doctor=${doc.id}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-shomal-primary"
                >
                  <Calendar className="h-4 w-4" />
                  {locale === "en" ? "Book visit" : "دریافت نوبت"}
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
