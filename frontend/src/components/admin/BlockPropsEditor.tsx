"use client";

import Input from "@/components/ui/Input";
import type { HomepageBlock } from "@/lib/cms-client";

type Props = {
  block: HomepageBlock;
  onChange: (props: Record<string, unknown>) => void;
  locale?: "fa" | "en";
};

export default function BlockPropsEditor({ block, onChange, locale = "fa" }: Props) {
  const props = block.props ?? {};
  const isEn = locale === "en";

  const set = (key: string, value: string | number) => {
    onChange({ ...props, [key]: value });
  };

  const field = (faKey: string, enKey: string, labelFa: string, labelEn: string) => (
    <Input
      label={isEn ? labelEn : labelFa}
      value={String(props[isEn ? enKey : faKey] ?? "")}
      onChange={(e) => set(isEn ? enKey : faKey, e.target.value)}
    />
  );

  if (block.type === "stats") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {field("title_fa", "title_en", "عنوان (فا)", "Title (EN)")}
        {field("subtitle_fa", "subtitle_en", "زیرعنوان (فا)", "Subtitle (EN)")}
        <Input label={isEn ? "Beds" : "تعداد تخت"} type="number" value={String(props.beds ?? "")} onChange={(e) => set("beds", Number(e.target.value))} />
        <Input label={isEn ? "Doctors" : "تعداد پزشک"} type="number" value={String(props.doctors ?? "")} onChange={(e) => set("doctors", Number(e.target.value))} />
        <Input label={isEn ? "Departments" : "تعداد بخش"} type="number" value={String(props.departments ?? "")} onChange={(e) => set("departments", Number(e.target.value))} />
        <Input label={isEn ? "Years" : "سال تجربه"} type="number" value={String(props.years ?? "")} onChange={(e) => set("years", Number(e.target.value))} />
      </div>
    );
  }

  if (block.type === "popular_doctors") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {field("title_fa", "title_en", "عنوان (فا)", "Title (EN)")}
        {field("subtitle_fa", "subtitle_en", "زیرعنوان (فa)", "Subtitle (EN)")}
        <Input label={isEn ? "Max shown" : "حداکثر نمایش"} type="number" value={String(props.max_count ?? 6)} onChange={(e) => set("max_count", Number(e.target.value))} />
      </div>
    );
  }

  if (block.type === "news") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {field("title_fa", "title_en", "عنوان (فا)", "Title (EN)")}
        {field("subtitle_fa", "subtitle_en", "زیرعنوان (فا)", "Subtitle (EN)")}
      </div>
    );
  }

  if (block.type === "about") {
    return (
      <div className="grid gap-3">
        {field("title_fa", "title_en", "عنوان (فa)", "Title (EN)")}
        {field("statement_title_fa", "statement_title_en", "عنوان بیانیه (فa)", "Statement title (EN)")}
        {field("location_fa", "location_en", "آدرس (فa)", "Location (EN)")}
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#0a1628]">
            {isEn ? "Statement (EN)" : "متن بیانیه (فa)"}
          </label>
          <textarea
            value={String(props[isEn ? "statement_en" : "statement_fa"] ?? "")}
            onChange={(e) => set(isEn ? "statement_en" : "statement_fa", e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-[#003b8e]/20 px-4 py-3 text-sm"
          />
        </div>
      </div>
    );
  }

  if (block.type === "appointment_steps" || block.type === "electronic_services" || block.type === "faq" || block.type === "insurance") {
    return (
      <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
        {isEn
          ? "Content uses default translations. Customize via Style panel."
          : "محتوا از ترجمه‌های پیش‌فرض استفاده می‌کند. استایل را از پنل Style تنظیم کنید."}
      </p>
    );
  }

  return null;
}
