"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserSearch, UserPlus, CreditCard, ArrowLeft } from "lucide-react";

const COPY = {
  fa: {
    title: "نوبت‌دهی در سه مرحله!",
    subtitle: "سریع‌ترین راه دریافت نوبت آنلاین — فقط سه قدم تا ویزیت پزشک",
    cta: "دریافت نوبت آنلاین",
    steps: [
      { title: "انتخاب پزشک و تخصص", desc: "پزشک و بخش مورد نظر خود را از لیست انتخاب کنید" },
      { title: "ثبت‌نام در سامانه", desc: "در کوتاه‌ترین زمان در سامانه ثبت‌نام کنید" },
      { title: "تأیید و پرداخت", desc: "نوبت خود را تأیید و هزینه ویزیت را پرداخت کنید" },
    ],
  },
  en: {
    title: "Book in 3 Easy Steps!",
    subtitle: "The fastest way to get an online appointment — three steps to your visit",
    cta: "Get Online Appointment",
    steps: [
      { title: "Choose Doctor & Specialty", desc: "Select your doctor and department from the list" },
      { title: "Register", desc: "Create your account in minutes" },
      { title: "Confirm & Pay", desc: "Confirm your slot and complete payment" },
    ],
  },
} as const;

const STEPS = [
  { n: 1, icon: UserSearch, href: "/doctors" },
  { n: 2, icon: UserPlus, href: "/signup" },
  { n: 3, icon: CreditCard, href: "/appointments" },
] as const;

export default function AppointmentSteps() {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;

  return (
    <section id="appointment-flow" className="section-shell">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-8 sm:mb-12 px-1">
          <p className="text-shomal-accent font-semibold text-sm mb-2 tracking-wide uppercase">
            {locale === "en" ? "Appointment Flow" : "فرآیند نوبت‌دهی"}
          </p>
          <h2 className="heading-section mb-3">{c.title}</h2>
          <p className="text-muted max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">{c.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {STEPS.map(({ n, icon: Icon, href }, i) => (
            <Link key={n} href={href} className="group block h-full rounded-2xl sm:rounded-[1.75rem] glass-card p-5 sm:p-8 min-w-0">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl gradient-shomal text-white font-bold text-lg sm:text-xl shadow-md shrink-0">
                  {n}
                </span>
                <div className="rounded-xl bg-[#003b8e]/10 p-2.5 sm:p-3 text-[#003b8e] dark:text-shomal-accent shrink-0">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <h3 className="heading-card text-base sm:text-lg mb-2">{c.steps[i].title}</h3>
              <p className="text-sm text-muted leading-relaxed">{c.steps[i].desc}</p>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/appointments"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl gradient-shomal px-8 sm:px-12 py-3.5 sm:py-4 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#003b8e]/25 hover:-translate-y-0.5 transition-transform"
          >
            {c.cta}
            <ArrowLeft className="h-5 w-5 rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
