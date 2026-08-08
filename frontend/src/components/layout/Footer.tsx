import { getLocale, getTranslations } from "next-intl/server";
import { Phone, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import BrandLogo from "@/components/layout/BrandLogo";
import { fetchPublicSite } from "@/lib/cms-client";

const FALLBACK = {
  fa: {
    address: "مازندران، آمل، بیمارستان فوق‌تخصصی شمال",
    phone: "۰۱۱-۴۴۲۲",
    blurb: "آمل، مازندران — مراقبت تخصصی، انسانی و شبانه‌روزی برای مردم شمال کشور.",
  },
  en: {
    address: "Amol, Mazandaran — Shomal Specialty Hospital",
    phone: "011-4422",
    blurb: "Specialty, human, around-the-clock care for northern Iran.",
  },
} as const;

export default async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const site = await fetchPublicSite();
  const fb = locale === "en" ? FALLBACK.en : FALLBACK.fa;

  const address =
    locale === "en"
      ? site?.address_en || t("address") || fb.address
      : site?.address_fa || t("address") || fb.address;
  const phone = site?.phone || t("phone") || fb.phone;

  return (
    <footer className="mt-auto bg-[#071525] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <BrandLogo onDark />
            </div>
            <p className="text-sm text-white/65 leading-7">{fb.blurb}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">
              {locale === "en" ? "Quick links" : "دسترسی سریع"}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/65">
              <li><Link href="/appointments" className="hover:text-white">{tNav("appointment")}</Link></li>
              <li><Link href="/doctors" className="hover:text-white">{tNav("doctors")}</Link></li>
              <li><Link href="/insurance" className="hover:text-white">{tNav("insurance")}</Link></li>
              <li><Link href="/blog" className="hover:text-white">{tNav("blog")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">{tNav("about")}</h3>
            <ul className="space-y-2.5 text-sm text-white/65">
              <li><a href="#about" className="hover:text-white">{tNav("about")}</a></li>
              <li><a href="#services" className="hover:text-white">{tNav("services")}</a></li>
              <li><a href="#doctors" className="hover:text-white">{tNav("doctors")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">
              {locale === "en" ? "Contact" : "تماس"}
            </h3>
            <div className="flex items-center gap-2 text-sm text-white/80 mb-3">
              <Phone className="h-4 w-4 text-[#3dcdb8]" />
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="hover:text-white">{phone}</a>
            </div>
            <div className="flex items-start gap-2 text-sm text-white/65">
              <MapPin className="h-4 w-4 text-[#3dcdb8] shrink-0 mt-0.5" />
              <span>{address}</span>
            </div>
            <p className="mt-3 text-xs text-white/45">
              {locale === "en" ? "Emergency 24/7" : "اورژانس ۲۴ ساعته، تمام روزهای هفته"}
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40">
          {t("rights")}
        </div>
      </div>
    </footer>
  );
}
