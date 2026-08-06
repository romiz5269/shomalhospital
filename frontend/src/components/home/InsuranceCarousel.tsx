"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchFeaturedInsurances,
  localizedField,
  type InsurancePublic,
} from "@/lib/api";

function InsuranceLogo({ item, locale }: { item: InsurancePublic; locale: string }) {
  const name = localizedField(locale, item.name_fa, item.name_en);
  const [err, setErr] = useState(false);

  if (item.logo_url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.logo_url}
        alt={name}
        className="h-14 max-w-[140px] object-contain"
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-shomal text-white text-xl font-bold shadow-lg">
      {name.charAt(0)}
    </div>
  );
}

export default function InsuranceCarousel({ locale }: { locale: string }) {
  const t = useTranslations("insurance");
  const [items, setItems] = useState<InsurancePublic[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchFeaturedInsurances().then(setItems);
  }, []);

  const current = items[index];

  return (
    <section id="insurance" className="section-shell bg-shomal-primary relative overflow-hidden !py-12 sm:!py-16">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">{t("title")}</h2>
          <Link href="/insurance" className="rounded-2xl border-2 border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
            {t("viewAll")}
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-white/70 py-12">{t("empty")}</p>
        ) : (
          <>
            <div className="relative flex items-center justify-center min-h-[220px]">
              <button type="button" onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} className="absolute start-0 z-10 hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-white text-shomal-primary shadow-2xl hover:scale-105 transition-transform">
                <ChevronRight className="h-7 w-7" />
              </button>

              <motion.div
                key={current?.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-16 sm:mx-24 w-full max-w-md"
              >
                <div className="rounded-[2rem] bg-white p-10 sm:p-12 text-center shadow-2xl">
                  <div className="flex justify-center mb-6">
                    {current && <InsuranceLogo item={current} locale={locale} />}
                  </div>
                  <p className="text-xl font-bold text-shomal-primary">
                    {localizedField(locale, current?.name_fa, current?.name_en)}
                  </p>
                </div>
              </motion.div>

              <button type="button" onClick={() => setIndex((i) => (i + 1) % items.length)} className="absolute end-0 z-10 hidden sm:flex h-14 w-14 items-center justify-center rounded-full bg-white text-shomal-primary shadow-2xl hover:scale-105 transition-transform">
                <ChevronLeft className="h-7 w-7" />
              </button>
            </div>

            <div className="flex justify-center gap-2 mt-8">
              {items.map((item, i) => (
                <button key={item.id} type="button" onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i === index ? "w-10 bg-white" : "w-2 bg-white/35"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
