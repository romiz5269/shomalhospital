import { getTranslations } from "next-intl/server";
import { Phone, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default async function TopBar() {
  const t = await getTranslations("topbar");

  return (
    <div className="hidden md:block bg-shomal-primary text-white text-sm">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 lg:px-8 py-2.5">
        <div className="flex items-center gap-6">
          <a href="tel:0114422" className="flex items-center gap-2 hover:text-shomal-accent transition-colors">
            <Phone className="h-4 w-4" />
            {t("phone")}
          </a>
          <span className="flex items-center gap-2 text-white/80">
            <Clock className="h-4 w-4" />
            {t("hours")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/appointments" className="hover:text-shomal-accent font-medium transition-colors">
            {t("appointment")}
          </Link>
          <Link href="/login" className="hover:text-shomal-accent transition-colors">
            {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
