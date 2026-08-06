"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  MonitorDot,
  CalendarClock,
  Users,
  CalendarPlus,
  ArrowUpLeft,
} from "lucide-react";

const cards = [
  { key: "onlineResults" as const, icon: MonitorDot, href: "/account", highlight: false },
  { key: "clinicSchedule" as const, icon: CalendarClock, href: "/appointments", highlight: false },
  { key: "staffPortal" as const, icon: Users, href: "/login", highlight: false },
  { key: "onlineAppointment" as const, icon: CalendarPlus, href: "/appointments", highlight: true },
];

export default function ServiceCards() {
  const t = useTranslations("services");

  return (
    <section id="services" className="relative -mt-16 z-10 px-4 lg:px-6 pb-8">
      <div className="mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl sm:text-3xl font-bold text-shomal-primary mb-10"
        >
          {t("title")}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {cards.map(({ key, icon: Icon, href, highlight }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={href}
                className={`group block glass-premium rounded-3xl p-6 h-full hover:-translate-y-2 transition-all duration-300 ${
                  highlight ? "ring-2 ring-shomal-primary/20 shadow-xl shadow-shomal-primary/10" : ""
                }`}
              >
                <div
                  className={`mb-5 inline-flex rounded-2xl p-4 transition-transform group-hover:scale-110 ${
                    highlight
                      ? "gradient-shomal text-white shadow-lg"
                      : "bg-gradient-to-br from-shomal-primary/10 to-shomal-accent/10 text-shomal-primary"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg text-shomal-primary mb-2 group-hover:text-shomal-primary-light transition-colors">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {t(`${key}.desc`)}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-shomal-accent group-hover:gap-2 transition-all">
                  {t("enter")}
                  <ArrowUpLeft className="h-4 w-4 rotate-180" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
