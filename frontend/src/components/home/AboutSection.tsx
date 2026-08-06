"use client";

import { useLocale } from "next-intl";
import { cmsText } from "@/lib/cms-utils";
import { MapPin } from "lucide-react";

const COPY = {
  fa: {
    title: "بیمارستان شمال؛ مرجع تخصصی سلامت و درمان",
    statementTitle: "بیانیه بیمارستان شمال",
    statement:
      "ما باور داریم مراقبت از بیمار، احترام به کرامت انسانی و ارائه خدمات تخصصی و فوق‌تخصصی بدون تبعیض، رسالت اصلی بیمارستان شمال است.",
    location: "آمل، مازندران — بیمارستان شمال",
  },
  en: {
    title: "Shomal Hospital — specialist healthcare reference",
    statementTitle: "Our care family statement",
    statement:
      "We believe goodness guides everything we do. Our mission is patient-centered care, human dignity, and specialist services without discrimination.",
    location: "Amol, Mazandaran — Shomal Hospital",
  },
} as const;

type Props = {
  blockProps?: Record<string, unknown>;
};

export default function AboutSection({ blockProps }: Props) {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;

  const title = cmsText(locale, blockProps, "title", c.title);
  const statementTitle = cmsText(locale, blockProps, "statement_title", c.statementTitle);
  const statement = cmsText(locale, blockProps, "statement", c.statement);
  const location = cmsText(locale, blockProps, "location", c.location);

  return (
    <section id="about" className="section-shell relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,59,142,0.06),transparent_60%)]" />
      <div className="mx-auto max-w-7xl relative">
        <div className="text-center mb-14">
          <p className="text-shomal-accent font-semibold text-sm mb-2 tracking-wide uppercase">
            {locale === "en" ? "About Us" : "درباره ما"}
          </p>
          <h2 className="heading-section text-3xl sm:text-4xl mb-4">{title}</h2>
          <div className="mx-auto h-1 w-20 gradient-shomal rounded-full" />
        </div>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          <div className="glass-premium rounded-[2rem] p-8 lg:p-10 flex flex-col justify-center border-s-4 border-[#003b8e]">
            <h3 className="heading-on-glass text-2xl mb-4">{statementTitle}</h3>
            <div className="h-1 w-16 gradient-shomal rounded-full mb-6" />
            <p className="text-muted leading-8 font-medium flex items-start gap-2">
              <MapPin className="h-5 w-5 text-shomal-accent shrink-0 mt-1" />
              <span>{location}</span>
            </p>
          </div>
          <div className="glass-premium rounded-[2rem] p-8 lg:p-10">
            <p className="text-foreground leading-9 text-justify text-lg">{statement}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
