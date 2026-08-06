import { getLocale, getTranslations } from "next-intl/server";
import { Phone, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import BrandLogo from "@/components/layout/BrandLogo";
import { fetchPublicSite } from "@/lib/cms-client";

const FALLBACK = {
  fa: { address: "آمل، مازندران — بیمارستان شمال", phone: "۰۱۱-۴۴۲۲" },
  en: { address: "Amol, Mazandaran — Shomal Hospital", phone: "011-4422" },
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
    <footer className="mt-auto bg-[#060d18] text-white border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4">
              <BrandLogo onDark />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{address}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">{tNav("services")}</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/appointments" className="hover:text-white transition-colors">{tNav("appointment")}</Link></li>
              <li><Link href="/insurance" className="hover:text-white transition-colors">{tNav("insurance")}</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">{tNav("blog")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">{tNav("about")}</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#about" className="hover:text-white transition-colors">{tNav("about")}</a></li>
              <li><a href="#doctors" className="hover:text-white transition-colors">{tNav("doctors")}</a></li>
              <li><a href="#guide" className="hover:text-white transition-colors">{tNav("guide")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">{tNav("international")}</h3>
            <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
              <Phone className="h-4 w-4 text-shomal-accent" />
              <a href={`tel:${phone.replace(/\D/g, "")}`} className="hover:text-white">{phone}</a>
            </div>
            <div className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 text-shomal-accent shrink-0 mt-0.5" />
              <span>{address}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/50">
          {t("rights")}
        </div>
      </div>
    </footer>
  );
}
