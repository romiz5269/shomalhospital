"use client";

import { useLocale } from "next-intl";
import { cmsText } from "@/lib/cms-utils";
import { HeartPulse, ShieldCheck, Sparkles, Sun } from "lucide-react";

const COPY = {
  fa: {
    eyebrow: "چرا بیمارستان شمال؟",
    title: "درمانی که با آرامش شروع می‌شود",
    statement:
      "از سال ۱۳۸۲ در آمل، با تمرکز بر تخصص‌های قلب و عروق، زنان و زایمان، جراحی و اورژانس ۲۴ ساعته در خدمت مردم مازندران هستیم.",
    features: [
      { title: "مراقبت انسانی", desc: "همراهی از پذیرش تا پیگیری پس از ترخیص.", icon: HeartPulse },
      { title: "تجهیزات پیشرفته", desc: "تصویربرداری، آزمایشگاه و اتاق عمل نسل جدید.", icon: Sparkles },
      { title: "اعتباربخشی", desc: "استانداردهای وزارت بهداشت و کنترل عفونت.", icon: ShieldCheck },
      { title: "فضای آرامش‌بخش", desc: "اتاق‌های روشن و گرم برای بیمار و خانواده.", icon: Sun },
    ],
  },
  en: {
    eyebrow: "Why Shomal Hospital?",
    title: "Care that begins with calm",
    statement:
      "Since 2003 in Amol, we focus on cardiology, obstetrics, surgery, and 24/7 emergency care for Mazandaran.",
    features: [
      { title: "Human care", desc: "Support from admission through follow-up.", icon: HeartPulse },
      { title: "Advanced tech", desc: "Imaging, labs, and modern ORs.", icon: Sparkles },
      { title: "Accredited", desc: "Ministry standards and infection control.", icon: ShieldCheck },
      { title: "Calm spaces", desc: "Bright rooms designed for families.", icon: Sun },
    ],
  },
} as const;

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80";

type Props = {
  blockProps?: Record<string, unknown>;
};

export default function AboutSection({ blockProps }: Props) {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;
  const title = cmsText(locale, blockProps, "title", c.title);
  const statement = cmsText(locale, blockProps, "statement", c.statement);

  return (
    <section id="about" className="section-shell-alt">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0 order-1">
            <p className="eyebrow mb-2 sm:mb-3">{c.eyebrow}</p>
            <h2 className="heading-section mb-3 sm:mb-4 text-[1.5rem] sm:text-[clamp(1.75rem,3vw,2.5rem)]">{title}</h2>
            <p className="text-muted text-sm sm:text-base leading-7 sm:leading-8 mb-6 sm:mb-8 max-w-xl">{statement}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {c.features.map(({ title: ft, desc, icon: Icon }) => (
                <div key={ft} className="rounded-2xl border border-shomal-border bg-white p-4 sm:p-5 dark:bg-white/5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#003b8e]/10 text-[#003b8e] dark:text-shomal-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="heading-card text-base mb-1">{ft}</h3>
                  <p className="text-sm text-muted leading-6">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative order-2 overflow-hidden rounded-2xl sm:rounded-[1.75rem] aspect-[16/10] sm:aspect-[4/3] lg:aspect-[5/4] shadow-[0_20px_50px_rgba(0,59,142,0.15)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ABOUT_IMAGE}
              alt={locale === "en" ? "Shomal Hospital" : "بیمارستان شمال"}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#003b8e]/50 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
