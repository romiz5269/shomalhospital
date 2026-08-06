"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Calendar } from "lucide-react";
import {
  doctorDisplayName,
  doctorDisplaySpecialty,
  type DoctorOut,
} from "@/lib/cms-client";

type Props = {
  doctors: DoctorOut[];
};

export default function DoctorsPageClient({ doctors }: Props) {
  const t = useTranslations("doctors");
  const locale = useLocale();

  return (
    <div className="min-h-screen mesh-bg">
      <div className="gradient-shomal py-16 px-4 text-center text-white">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("pageTitle")}</h1>
        <p className="text-white/85 max-w-xl mx-auto">{t("pageDesc")}</p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {doctors.length === 0 ? (
          <p className="text-center text-gray-500 py-16">{t("empty")}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {doctors.map((doc) => (
              <article
                key={doc.id}
                className="rounded-3xl bg-white border border-shomal-border/60 overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="relative h-56">
                  <Image
                    src={doc.image_url || "https://ui-avatars.com/api/?name=DR&background=003B8E&color=fff&size=256"}
                    alt={doctorDisplayName(locale, doc)}
                    fill
                    className="object-cover object-top"
                    sizes="25vw"
                  />
                </div>
                <div className="p-5">
                  <h2 className="font-bold text-shomal-primary">{doctorDisplayName(locale, doc)}</h2>
                  <p className="text-sm text-gray-600 mt-1">{doctorDisplaySpecialty(locale, doc)}</p>
                  {doc.bio_fa && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {locale === "en" && doc.bio_en ? doc.bio_en : doc.bio_fa}
                    </p>
                  )}
                  <Link
                    href={`/appointments?dept=${doc.department_code || "OPD"}&doctor=${doc.id}`}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl gradient-shomal py-3 text-sm font-semibold text-white mt-4"
                  >
                    <Calendar className="h-4 w-4" />
                    {t("book")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
