"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

const COPY = {
  fa: {
    label: "راهنما",
    title: "سوالات متداول",
    q1: { q: "چگونه نوبت آنلاین بگیرم؟", a: "ابتدا ثبت‌نام یا ورود کنید، سپس از بخش نوبت‌گیری بخش و زمان را انتخاب و ثبت کنید." },
    q2: { q: "جواب آزمایش را کجا ببینم؟", a: "پس از ورود به حساب، بخش جوابدهی آنلاین در دسترس است." },
    q3: { q: "کدام بیمه‌ها طرف قرارداد هستند؟", a: "لیست کامل بیمه‌های طرف قرارداد در بخش بیمه‌ها قابل مشاهده است." },
    q4: { q: "ساعات پذیرش بیمارستان؟", a: "پذیرش سرپایی ۸ تا ۲۰ — اورژانس ۲۴ ساعته." },
    q5: { q: "آدرس و تماس؟", a: "آمل، مازندران — تماس: ۰۱۱-۴۴۲۲" },
  },
  en: {
    label: "Guide",
    title: "Frequently Asked Questions",
    q1: { q: "How do I book online?", a: "Sign up or log in, then choose department and time in the appointments section." },
    q2: { q: "Where are lab results?", a: "After login, online results are available in your patient portal." },
    q3: { q: "Which insurances are accepted?", a: "See the full list in the Insurance section." },
    q4: { q: "Admission hours?", a: "Outpatient 8AM–8PM — Emergency 24/7." },
    q5: { q: "Address & contact?", a: "Amol, Mazandaran — Phone: 011-4422" },
  },
} as const;

export default function FAQSection() {
  const locale = useLocale();
  const t = locale === "en" ? COPY.en : COPY.fa;
  const [open, setOpen] = useState<string | null>("q1");

  return (
    <section id="guide" className="section-shell">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-shomal-accent font-semibold text-sm mb-2">{t.label}</p>
          <h2 className="heading-section text-3xl sm:text-4xl">{t.title}</h2>
        </div>

        <div className="space-y-3">
          {FAQ_KEYS.map((key) => {
            const isOpen = open === key;
            const item = t[key];
            return (
              <div key={key} className="rounded-2xl glass-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start heading-on-glass text-base hover:bg-[#003b8e]/5 transition-colors"
                >
                  {item.q}
                  <ChevronDown className={clsx("h-5 w-5 shrink-0 text-shomal-accent transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <p className="px-6 pb-5 text-muted leading-8 text-sm border-t border-[#003b8e]/10 pt-4">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
