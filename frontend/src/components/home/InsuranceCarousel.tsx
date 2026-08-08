"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import {
  fetchFeaturedInsurances,
  fetchAllInsurances,
  localizedField,
  type InsurancePublic,
} from "@/lib/api";

const LOCAL_FALLBACK: InsurancePublic[] = [
  "tamin",
  "salamat",
  "niru",
  "iran",
  "asia",
  "alborz",
  "dana",
  "pasargad",
  "moalem",
  "saman",
  "parsian",
  "kosar",
].map((code, i) => ({
  id: `fb-${code}`,
  code,
  name_fa: code,
  name_en: code,
  logo_url: `/insurance-logos/${code}.svg`,
  sort_order: i + 1,
  is_featured: true,
}));

const NAMES_FA: Record<string, string> = {
  tamin: "تأمین اجتماعی",
  salamat: "بیمه سلامت",
  niru: "نیروهای مسلح",
  iran: "بیمه ایران",
  asia: "بیمه آسیا",
  alborz: "بیمه البرز",
  dana: "بیمه دانا",
  pasargad: "بیمه پاسارگاد",
  moalem: "بیمه معلم",
  saman: "بیمه سامان",
  parsian: "بیمه پارسیان",
  kosar: "بیمه کوثر",
};

/** Map legacy seed filenames (SSO.svg) → real public assets (tamin.svg). */
const LEGACY_LOGO: Record<string, string> = {
  sso: "tamin",
  salamat: "salamat",
  isa: "niru",
  iran: "iran",
  asia: "asia",
  alborz: "alborz",
  dana: "dana",
  pasargad: "pasargad",
  moalem: "moalem",
  saman: "saman",
  parsian: "parsian",
  kosar: "kosar",
};

function resolveLogo(url?: string | null, code?: string): string {
  const u = (url || "").trim();
  // Uploaded via CMS blog → same-origin proxy
  const up = u.indexOf("/uploads/");
  if (up !== -1) {
    const name = u.slice(up + "/uploads/".length).split("?")[0].replace(/^\/+/, "");
    if (name && !name.includes("..")) return `/cms-media/uploads/${name}`;
  }
  // External URL from company site / Clearbit — use as-is
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/cms-media/")) return u;
  if (u.startsWith("/insurance-logos/")) {
    const file = u.split("/insurance-logos/")[1]?.split("?")[0] || "";
    const base = file.replace(/\.svg$/i, "").toLowerCase();
    const mapped = LEGACY_LOGO[base] || (NAMES_FA[base] ? base : "");
    if (mapped) return `/insurance-logos/${mapped}.svg`;
    return u;
  }
  if (code && NAMES_FA[code]) return `/insurance-logos/${code}.svg`;
  return u;
}

function LogoCard({ item, locale }: { item: InsurancePublic; locale: string }) {
  const name =
    localizedField(locale, item.name_fa, item.name_en) ||
    NAMES_FA[item.code] ||
    item.code;
  const logo = resolveLogo(item.logo_url, item.code);
  const [err, setErr] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-white px-3 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] min-h-[8.25rem] transition-transform hover:-translate-y-0.5">
      {logo && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={name}
          className="h-14 w-14 rounded-xl object-contain"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#003b8e] text-white text-xl font-bold">
          {name.charAt(0)}
        </div>
      )}
      <p className="text-center text-xs font-bold text-[#003b8e] leading-snug line-clamp-2 px-1">
        {NAMES_FA[item.code] && locale !== "en" ? NAMES_FA[item.code] : name}
      </p>
    </div>
  );
}

export default function InsuranceCarousel({ locale }: { locale: string }) {
  const t = useTranslations("insurance");
  const [items, setItems] = useState<InsurancePublic[]>(
    LOCAL_FALLBACK.map((x) => ({
      ...x,
      name_fa: NAMES_FA[x.code] || x.code,
      name_en: x.code,
    })),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const featured = await fetchFeaturedInsurances();
      let list = featured;
      if (!list.length) list = await fetchAllInsurances();
      if (cancelled) return;
      if (list.length) {
        setItems(
          list.map((it) => ({
            ...it,
            logo_url: resolveLogo(it.logo_url, it.code),
            name_fa: it.name_fa || NAMES_FA[it.code] || it.code,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="insurance"
      className="relative overflow-hidden py-14 sm:py-18"
      style={{ background: "#003b8e" }}
    >
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">
              {locale === "en" ? "Coverage partners" : "طرف‌های قرارداد"}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t("title")}</h2>
          </div>
          <Link
            href="/insurance"
            className="rounded-2xl border-2 border-white/55 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {items.map((item) => (
            <LogoCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
