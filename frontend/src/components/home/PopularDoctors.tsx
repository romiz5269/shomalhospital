"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Calendar, ArrowLeft, Star, Sparkles } from "lucide-react";
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

  const title = cmsText(locale, blockProps, "title", t("title"));
  const subtitle = cmsText(locale, blockProps, "subtitle", t("pageDesc"));
  const maxCount = cmsNumber(blockProps, "max_count", 6);
  const list = (doctors ?? []).slice(0, maxCount);

  if (list.length === 0) return null;

  const featured = list[0];
  const rest = list.slice(1);

  return (
    <section id="doctors" className="section-shell-alt">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-8 sm:mb-12">
          <div className="max-w-2xl min-w-0">
            <div className="inline-flex items-center gap-2 text-shomal-accent font-semibold text-sm mb-3">
              <Sparkles className="h-4 w-4" />
              {t("label")}
            </div>
            <h2 className="heading-section leading-tight">{title}</h2>
            <p className="text-muted mt-3 leading-relaxed text-sm sm:text-base">{subtitle}</p>
          </div>
          <Link href="/doctors" className="btn-outline shrink-0 self-start sm:self-auto">{t("viewAll")}</Link>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <article className="lg:col-span-5 group relative overflow-hidden rounded-2xl sm:rounded-[2rem] glass-card min-w-0">
            <div className="relative h-[280px] sm:h-[380px] lg:h-[420px]">
              <Image
                src={featured.image_url || "https://ui-avatars.com/api/?name=DR&background=003B8E&color=fff&size=512"}
                alt={doctorDisplayName(locale, featured)}
                fill
                className="object-cover object-top"
                sizes="(max-width:1024px) 100vw, 40vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001533]/95 via-[#003B8E]/35 to-transparent" />
              <div className="absolute top-4 start-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-[#001533] flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" />
                {t("featured")}
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 lg:p-8 text-white">
                <p className="text-sm text-white/90 mb-1">{doctorDisplaySpecialty(locale, featured)}</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 break-words">{doctorDisplayName(locale, featured)}</h3>
                <Link
                  href={`/appointments?dept=${featured.department_code || "OPD"}&doctor=${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-shomal-primary px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-bold"
                >
                  <Calendar className="h-4 w-4" />
                  {t("book")}
                </Link>
              </div>
            </div>
          </article>

          <div className="lg:col-span-7 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
            {rest.map((doc) => (
              <article key={doc.id} className="group flex flex-col rounded-2xl sm:rounded-[1.5rem] glass-card overflow-hidden min-w-0">
                <div className="relative h-36 sm:h-44 overflow-hidden">
                  <Image
                    src={doc.image_url || "https://ui-avatars.com/api/?name=DR&background=003B8E&color=fff&size=256"}
                    alt={doctorDisplayName(locale, doc)}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width:640px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0">
                  <h3 className="heading-card text-base sm:text-lg break-words">{doctorDisplayName(locale, doc)}</h3>
                  <p className="text-sm text-muted mt-1 mb-4">{doctorDisplaySpecialty(locale, doc)}</p>
                  <Link
                    href={`/appointments?dept=${doc.department_code || "OPD"}&doctor=${doc.id}`}
                    className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-shomal-primary dark:text-shomal-accent"
                  >
                    {t("book")}
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
