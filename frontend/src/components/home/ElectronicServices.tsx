"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  HeartPulse,
  Scissors,
} from "lucide-react";

const COPY = {
  fa: {
    eyebrow: "بخش‌های بیمارستان",
    title: "تخصص‌های ما",
    items: [
      { title: "قلب و عروق", desc: "آنژیوگرافی، اکو و مراقبت ویژه قلبی", icon: HeartPulse },
      { title: "زنان و زایمان", desc: "زایمان بی‌درد، بارداری پرخطر و نازایی", icon: Baby },
      { title: "اورژانس ۲۴ ساعته", desc: "تریاژ سریع و تیم آماده در تمام ساعات", icon: Activity },
      { title: "جراحی عمومی", desc: "اتاق عمل مجهز و جراحی‌های کم‌تهاجمی", icon: Scissors },
      { title: "مغز و اعصاب", desc: "نوار مغز، سکته و درمان‌های تخصصی", icon: Brain },
      { title: "ارتوپدی", desc: "تعویض مفصل، آرتروسکوپی و شکستگی‌ها", icon: Bone },
    ],
  },
  en: {
    eyebrow: "Hospital departments",
    title: "Our specialties",
    items: [
      { title: "Cardiology", desc: "Angiography, echo, and cardiac ICU", icon: HeartPulse },
      { title: "Obstetrics", desc: "Painless delivery and high-risk pregnancy", icon: Baby },
      { title: "24/7 Emergency", desc: "Fast triage around the clock", icon: Activity },
      { title: "General Surgery", desc: "Modern OR and minimally invasive care", icon: Scissors },
      { title: "Neurology", desc: "EEG, stroke, and specialty treatments", icon: Brain },
      { title: "Orthopedics", desc: "Joints, arthroscopy, and fractures", icon: Bone },
    ],
  },
} as const;

export default function ElectronicServices() {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;

  return (
    <section id="services" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 sm:mb-12 max-w-2xl">
          <p className="eyebrow mb-2">{c.eyebrow}</p>
          <h2 className="heading-section">{c.title}</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map(({ title, desc, icon: Icon }) => (
            <Link
              key={title}
              href="/appointments"
              className="group rounded-2xl border border-shomal-border bg-white p-5 sm:p-6 transition-all hover:-translate-y-1 hover:border-[#003b8e]/30 hover:shadow-lg dark:bg-white/5"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-shomal text-white shadow-md">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="heading-card text-lg mb-2 group-hover:text-shomal-primary">{title}</h3>
              <p className="text-sm text-muted leading-7">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
