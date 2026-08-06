import type { HomepageBlock } from "@/lib/cms-client";

export type BlockAnimation =
  | "none"
  | "fade-up"
  | "fade-in"
  | "slide-up"
  | "zoom-in"
  | "slide-right";

export type BlockStyleConfig = {
  animation?: BlockAnimation;
  animation_intensity?: number;
  padding_y?: number;
  padding_x?: number;
  glass?: number;
  max_width?: number;
  border_radius?: number;
  hide_mobile?: boolean;
  hide_desktop?: boolean;
  custom_level?: number;
};

export type BlockTypeDef = {
  type: string;
  labelFa: string;
  labelEn: string;
  icon: string;
  category: "hero" | "content" | "data" | "cta";
  defaultProps: Record<string, unknown>;
};

export const DEFAULT_BLOCK_STYLES: BlockStyleConfig = {
  animation: "fade-up",
  animation_intensity: 70,
  padding_y: 50,
  padding_x: 50,
  glass: 65,
  max_width: 90,
  border_radius: 50,
  custom_level: 50,
  hide_mobile: false,
  hide_desktop: false,
};

export const BLOCK_REGISTRY: BlockTypeDef[] = [
  {
    type: "hero",
    labelFa: "ویدیو هیرو",
    labelEn: "Video Hero",
    icon: "🎬",
    category: "hero",
    defaultProps: { ...DEFAULT_BLOCK_STYLES, animation: "fade-in", padding_y: 0 },
  },
  {
    type: "appointment_steps",
    labelFa: "مراحل نوبت",
    labelEn: "Appointment Steps",
    icon: "📋",
    category: "cta",
    defaultProps: { ...DEFAULT_BLOCK_STYLES },
  },
  {
    type: "electronic_services",
    labelFa: "خدمات الکترونیک",
    labelEn: "E-Services",
    icon: "💻",
    category: "content",
    defaultProps: { ...DEFAULT_BLOCK_STYLES },
  },
  {
    type: "stats",
    labelFa: "آمار",
    labelEn: "Statistics",
    icon: "📊",
    category: "data",
    defaultProps: {
      ...DEFAULT_BLOCK_STYLES,
      title_fa: "آمار بیمارستان شمال",
      title_en: "Shomal Hospital at a Glance",
      subtitle_fa: "",
      subtitle_en: "",
      beds: 180,
      doctors: 95,
      departments: 12,
      years: 25,
    },
  },
  {
    type: "insurance",
    labelFa: "بیمه‌ها",
    labelEn: "Insurance",
    icon: "🛡️",
    category: "data",
    defaultProps: { ...DEFAULT_BLOCK_STYLES, animation: "zoom-in" },
  },
  {
    type: "popular_doctors",
    labelFa: "پزشکان محبوب",
    labelEn: "Popular Doctors",
    icon: "👨‍⚕️",
    category: "content",
    defaultProps: {
      ...DEFAULT_BLOCK_STYLES,
      title_fa: "پزشکان محبوب",
      title_en: "Popular Doctors",
      subtitle_fa: "تیم متخصص ما آماده ارائه بهترین خدمات درمانی",
      subtitle_en: "Our expert team delivers exceptional care",
      max_count: 6,
    },
  },
  {
    type: "about",
    labelFa: "درباره ما",
    labelEn: "About",
    icon: "🏥",
    category: "content",
    defaultProps: {
      ...DEFAULT_BLOCK_STYLES,
      title_fa: "بیمارستان شمال؛ مرجع تخصصی سلامت و درمان",
      title_en: "Shomal Hospital — Specialty Care",
      statement_title_fa: "بیانیه بیمارستان شمال",
      statement_title_en: "Our Mission",
      statement_fa: "ما باور داریم مراقبت از بیمار، احترام به کرامت انسانی و ارائه خدمات تخصصی بدون تبعیض، رسالت اصلی بیمارستان شمال است.",
      statement_en: "Compassionate care and human dignity define our mission.",
      location_fa: "آمل، مازندران — بیمارستان شمال",
      location_en: "Amol, Mazandaran — Shomal Hospital",
    },
  },
  {
    type: "news",
    labelFa: "اخبار",
    labelEn: "News",
    icon: "📰",
    category: "content",
    defaultProps: {
      ...DEFAULT_BLOCK_STYLES,
      title_fa: "اخبار و وبلاگ",
      title_en: "News & Blog",
      subtitle_fa: "آخرین اخبار و رویدادها",
      subtitle_en: "Latest news and events",
    },
  },
  {
    type: "faq",
    labelFa: "سوالات متداول",
    labelEn: "FAQ",
    icon: "❓",
    category: "content",
    defaultProps: { ...DEFAULT_BLOCK_STYLES },
  },
];

export function getBlockDef(type: string): BlockTypeDef | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}

export function createBlock(type: string, order: number): HomepageBlock {
  const def = getBlockDef(type);
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    enabled: true,
    order,
    props: { ...(def?.defaultProps ?? DEFAULT_BLOCK_STYLES) },
  };
}

function baseBlocks(): HomepageBlock[] {
  return BLOCK_REGISTRY.map((b, i) => createBlock(b.type, i));
}

export type PageTemplate = {
  id: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  thumbnail: string;
  customLevel: number;
  blocks: () => HomepageBlock[];
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "classic",
    nameFa: "کلاسیک شمال",
    nameEn: "Classic Shomal",
    descriptionFa: "قالب کامل با تمام بخش‌ها — مناسب بیمارستان‌های بزرگ",
    descriptionEn: "Full layout with all sections",
    thumbnail: "linear-gradient(135deg,#003b8e,#5ba4d9)",
    customLevel: 30,
    blocks: () => baseBlocks(),
  },
  {
    id: "video-hero",
    nameFa: "هیرو ویدیویی",
    nameEn: "Video Hero",
    descriptionFa: "تمرکز روی بنر ویدیو + نوبت‌دهی + پزشکان",
    descriptionEn: "Video banner focus with booking flow",
    thumbnail: "linear-gradient(135deg,#001533,#003b8e)",
    customLevel: 45,
    blocks: () => {
      const types = ["hero", "appointment_steps", "stats", "popular_doctors", "about", "faq"];
      return types.map((t, i) => {
        const b = createBlock(t, i);
        if (t === "hero") b.props = { ...b.props, animation: "fade-in", glass: 20, padding_y: 0 };
        return b;
      });
    },
  },
  {
    id: "minimal",
    nameFa: "مینیمال",
    nameEn: "Minimal",
    descriptionFa: "ساده و سریع — هیرو، نوبت، درباره، راهنما",
    descriptionEn: "Clean minimal layout",
    thumbnail: "linear-gradient(135deg,#eef4fb,#003b8e)",
    customLevel: 15,
    blocks: () => ["hero", "appointment_steps", "about", "faq"].map((t, i) => createBlock(t, i)),
  },
  {
    id: "premium-glass",
    nameFa: "شیشه‌ای پریمیوم",
    nameEn: "Premium Glass",
    descriptionFa: "تم شیشه‌ای ۲۰۲۶ با انیمیشن‌های نرم",
    descriptionEn: "2026 glass theme with smooth animations",
    thumbnail: "linear-gradient(135deg,rgba(255,255,255,0.9),#5ba4d9)",
    customLevel: 85,
    blocks: () =>
      baseBlocks().map((b) => ({
        ...b,
        props: {
          ...b.props,
          glass: 90,
          animation: "fade-up" as BlockAnimation,
          animation_intensity: 85,
          border_radius: 75,
          custom_level: 85,
        },
      })),
  },
  {
    id: "news-focus",
    nameFa: "اخبار محور",
    nameEn: "News Focus",
    descriptionFa: "مناسب روابط عمومی — اخبار و رویدادها در مرکز",
    descriptionEn: "PR-focused with news prominence",
    thumbnail: "linear-gradient(135deg,#003b8e,#2ec4a0)",
    customLevel: 55,
    blocks: () => {
      const types = ["hero", "news", "appointment_steps", "popular_doctors", "insurance", "faq"];
      return types.map((t, i) => createBlock(t, i));
    },
  },
  {
    id: "services",
    nameFa: "خدمات محور",
    nameEn: "Services Hub",
    descriptionFa: "خدمات الکترونیک + بیمه + آمار",
    descriptionEn: "E-services and insurance focus",
    thumbnail: "linear-gradient(135deg,#1a56b8,#5ba4d9)",
    customLevel: 60,
    blocks: () => {
      const types = ["hero", "electronic_services", "stats", "insurance", "appointment_steps", "faq"];
      return types.map((t, i) => createBlock(t, i));
    },
  },
];

export function applyTemplate(templateId: string): HomepageBlock[] {
  const tpl = PAGE_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return baseBlocks();
  return tpl.blocks().map((b, i) => ({ ...b, order: i }));
}

export function mergeBlockStyles(props: Record<string, unknown>): BlockStyleConfig {
  return {
    animation: (props.animation as BlockAnimation) ?? DEFAULT_BLOCK_STYLES.animation,
    animation_intensity: Number(props.animation_intensity ?? DEFAULT_BLOCK_STYLES.animation_intensity),
    padding_y: Number(props.padding_y ?? DEFAULT_BLOCK_STYLES.padding_y),
    padding_x: Number(props.padding_x ?? DEFAULT_BLOCK_STYLES.padding_x),
    glass: Number(props.glass ?? DEFAULT_BLOCK_STYLES.glass),
    max_width: Number(props.max_width ?? DEFAULT_BLOCK_STYLES.max_width),
    border_radius: Number(props.border_radius ?? DEFAULT_BLOCK_STYLES.border_radius),
    custom_level: Number(props.custom_level ?? DEFAULT_BLOCK_STYLES.custom_level),
    hide_mobile: Boolean(props.hide_mobile),
    hide_desktop: Boolean(props.hide_desktop),
  };
}
