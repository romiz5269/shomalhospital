"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserSearch, UserPlus, CreditCard, ArrowLeft } from "lucide-react";

const COPY = {
  fa: {
    eyebrow: "درخواست نوبت",
    title: "نوبت‌دهی آنلاین در سه مرحله",
    subtitle: "شماره موبایل خود را آماده کنید؛ پذیرش برای هماهنگی با شما تماس می‌گیرد — یا همین حالا نوبت بگیرید.",
    cta: "شروع نوبت‌دهی",
    steps: [
      { title: "انتخاب پزشک و تخصص", desc: "پزشک و بخش مورد نظر را انتخاب کنید" },
      { title: "ثبت‌نام در سامانه", desc: "در کوتاه‌ترین زمان ثبت‌نام کنید" },
      { title: "تأیید نوبت", desc: "زمان ویزیت را تأیید کنید" },
    ],
  },
  en: {
    eyebrow: "Appointments",
    title: "Book online in 3 steps",
    subtitle: "Choose a doctor, register, and confirm your visit in minutes.",
    cta: "Start booking",
    steps: [
      { title: "Choose doctor", desc: "Pick specialty and physician" },
      { title: "Register", desc: "Create your account quickly" },
      { title: "Confirm", desc: "Confirm your visit time" },
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
    <section id="appointment-flow" className="section-shell relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,59,142,0.08),transparent_60%)]" />
      <div className="mx-auto max-w-7xl relative">
        <div className="rounded-[2rem] bg-[#003b8e] px-5 py-10 sm:px-10 sm:py-14 text-white shadow-2xl shadow-[#003b8e]/25">
          <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-12">
            <p className="text-[#7fd4c8] text-sm font-semibold mb-2">{c.eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{c.title}</h2>
            <p className="text-white/80 text-sm sm:text-base leading-7">{c.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {STEPS.map(({ n, icon: Icon, href }, i) => (
              <Link
                key={n}
                href={href}
                className="rounded-2xl bg-white/10 border border-white/15 p-5 hover:bg-white/15 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d9b8a] font-bold">{n}</span>
                  <Icon className="h-5 w-5 text-[#7fd4c8]" />
                </div>
                <h3 className="font-bold mb-1">{c.steps[i].title}</h3>
                <p className="text-sm text-white/70">{c.steps[i].desc}</p>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/appointments"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-[#003b8e] font-bold hover:bg-[#e8f7f4] transition-colors"
            >
              {c.cta}
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
