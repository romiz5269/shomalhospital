"use client";

import clsx from "clsx";
import type { HomepageBlock } from "@/lib/cms-client";
import type { BlockAnimation } from "@/lib/block-registry";
import BlockPropsEditor from "@/components/admin/BlockPropsEditor";
import { getBlockDef } from "@/lib/block-registry";

type Props = {
  block: HomepageBlock | null;
  onChange: (props: Record<string, unknown>) => void;
  locale: "fa" | "en";
  panel: "content" | "style";
};

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-[#334d6e]">{label}</span>
        <span className="font-bold text-[#003b8e] tabular-nums">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-[#003b8e]/15 accent-[#003b8e] cursor-pointer"
      />
    </div>
  );
}

const ANIMATIONS: { id: BlockAnimation; label: string }[] = [
  { id: "none", label: "بدون انیمیشن" },
  { id: "fade-up", label: "Fade Up" },
  { id: "fade-in", label: "Fade In" },
  { id: "slide-up", label: "Slide Up" },
  { id: "slide-right", label: "Slide Right" },
  { id: "zoom-in", label: "Zoom In" },
];

export default function BuilderInspector({ block, onChange, locale, panel }: Props) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 p-6 text-center">
        {locale === "en" ? "Select a block to edit" : "یک بلوک را برای ویرایش انتخاب کنید"}
      </div>
    );
  }

  const props = block.props ?? {};
  const def = getBlockDef(block.type);
  const set = (key: string, value: unknown) => onChange({ ...props, [key]: value });
  const num = (key: string, fallback: number) => Number(props[key] ?? fallback);

  if (panel === "content") {
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#003b8e] mb-1">
            {locale === "en" ? "Content" : "محتوا"}
          </p>
          <p className="text-sm font-semibold text-[#0a1628]">
            {locale === "en" ? def?.labelEn : def?.labelFa} — {block.type}
          </p>
        </div>
        <BlockPropsEditor block={block} onChange={onChange} locale={locale} />
        {block.type === "hero" && (
          <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
            {locale === "en"
              ? "Hero video & title are edited in Site Settings tab."
              : "ویدیو و عنوان هیرو از تب «تنظیمات سایت» ویرایش می‌شود."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#003b8e] mb-1">
          {locale === "en" ? "Style & Animation" : "استایل و انیمیشن"}
        </p>
        <p className="text-xs text-gray-500">
          {locale === "en" ? "Customize 0% – 100%" : "سفارشی‌سازی ۰٪ تا ۱۰۰٪"}
        </p>
      </div>

      <Slider
        label={locale === "en" ? "Overall customization" : "میزان سفارشی‌سازی کلی"}
        value={num("custom_level", 50)}
        onChange={(v) => set("custom_level", v)}
      />

      <div>
        <label className="text-xs font-medium text-[#334d6e] mb-2 block">
          {locale === "en" ? "Animation" : "انیمیشن"}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ANIMATIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => set("animation", id)}
              className={clsx(
                "rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors",
                (props.animation ?? "fade-up") === id
                  ? "border-[#003b8e] bg-[#003b8e] text-white"
                  : "border-gray-200 text-gray-600 hover:border-[#003b8e]/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label={locale === "en" ? "Animation intensity" : "شدت انیمیشن"}
        value={num("animation_intensity", 70)}
        onChange={(v) => set("animation_intensity", v)}
      />
      <Slider
        label={locale === "en" ? "Vertical padding" : "فاصله عمودی"}
        value={num("padding_y", 50)}
        onChange={(v) => set("padding_y", v)}
      />
      <Slider
        label={locale === "en" ? "Horizontal padding" : "فاصله افقی"}
        value={num("padding_x", 50)}
        onChange={(v) => set("padding_x", v)}
      />
      <Slider
        label={locale === "en" ? "Glass effect" : "افکت شیشه‌ای"}
        value={num("glass", 65)}
        onChange={(v) => set("glass", v)}
      />
      <Slider
        label={locale === "en" ? "Content width" : "عرض محتوا"}
        value={num("max_width", 90)}
        onChange={(v) => set("max_width", v)}
      />
      <Slider
        label={locale === "en" ? "Border radius" : "گردی گوشه‌ها"}
        value={num("border_radius", 50)}
        onChange={(v) => set("border_radius", v)}
      />

      <div className="space-y-2 pt-2 border-t border-gray-100">
        <p className="text-xs font-medium text-[#334d6e]">
          {locale === "en" ? "Responsive visibility" : "نمایش ریسپانسیو"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(props.hide_mobile)}
            onChange={(e) => set("hide_mobile", e.target.checked)}
          />
          {locale === "en" ? "Hide on mobile" : "مخفی در موبایل"}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(props.hide_desktop)}
            onChange={(e) => set("hide_desktop", e.target.checked)}
          />
          {locale === "en" ? "Hide on desktop" : "مخفی در دسکتاپ"}
        </label>
      </div>
    </div>
  );
}
