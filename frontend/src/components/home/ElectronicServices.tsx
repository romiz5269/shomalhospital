"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  MonitorDot,
  CalendarClock,
  Users,
  CalendarPlus,
  ArrowLeft,
} from "lucide-react";

const services = [
  { key: "labResults", icon: MonitorDot, href: "/account", color: "from-blue-600 to-blue-400" },
  { key: "clinicSchedule", icon: CalendarClock, href: "/appointments", color: "from-cyan-600 to-teal-400" },
  { key: "staffPortal", icon: Users, href: "/login", color: "from-indigo-600 to-violet-400" },
  { key: "onlineAppointment", icon: CalendarPlus, href: "/appointments", color: "from-shomal-primary to-shomal-accent" },
] as const;

export default function ElectronicServices() {
  const t = useTranslations("eServices");

  return (
    <section id="services" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <p className="text-shomal-accent font-semibold text-sm mb-2 tracking-wide uppercase">{t("label")}</p>
          <h2 className="heading-section text-3xl sm:text-4xl mb-4">{t("title")}</h2>
          <p className="text-muted max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {services.map(({ key, icon: Icon, href, color }) => (
            <Link
              key={key}
              href={href}
              className="group relative flex flex-col h-full rounded-3xl glass-card p-6 sm:p-7 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${color}`} />
              <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${color} p-4 text-white`}>
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="heading-card text-lg mb-2">{t(`${key}.title`)}</h3>
              <p className="text-sm text-muted leading-relaxed flex-1">{t(`${key}.desc`)}</p>
              <div className="mt-6 flex justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-shomal-primary/30 text-shomal-primary dark:text-shomal-accent group-hover:gradient-shomal group-hover:text-white group-hover:border-transparent transition-colors">
                  <ArrowLeft className="h-5 w-5 rotate-180" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
