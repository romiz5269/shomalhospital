"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import clsx from "clsx";
import { Calendar } from "lucide-react";
import { type BlogPostPublic } from "@/lib/api";
import { cmsText } from "@/lib/cms-utils";
import {
  BLOG_TABS,
  TAB_LABELS,
  categoryMatchesTab,
  normalizeCategory,
  type BlogCategory,
} from "@/lib/blog-utils";
import BlogCard from "@/components/blog/BlogCard";
import BlogFeaturedCard from "@/components/blog/BlogFeaturedCard";

const COPY = {
  fa: {
    label: "اخبار و مقالات",
    title: "تازه‌های سلامت",
    subtitle: "آخرین اخبار، رویدادها و مطالب آموزشی بیمارستان شمال",
    viewAll: "مشاهده همه",
    readMore: "ادامه مطلب",
    empty: "موردی یافت نشد",
    bookCta: "بعد از مطالعه، نوبت بگیرید",
  },
  en: {
    label: "Media",
    title: "News & Blog",
    subtitle: "Latest news, events and health education from Shomal Hospital",
    viewAll: "View All",
    readMore: "Read More",
    empty: "No items found",
    bookCta: "Book an appointment after reading",
  },
} as const;

type Props = {
  initialPosts?: BlogPostPublic[];
  blockProps?: Record<string, unknown>;
};

export default function NewsTabsSection({ initialPosts = [], blockProps }: Props) {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;
  const [tab, setTab] = useState<BlogCategory>("all");

  const title = cmsText(locale, blockProps, "title", c.title);
  const subtitle = cmsText(locale, blockProps, "subtitle", c.subtitle);

  const filtered = initialPosts.filter((post) =>
    categoryMatchesTab(normalizeCategory(post.category), tab),
  );

  const featured = filtered[0];
  const side = filtered.slice(1, 4);
  const grid = filtered.slice(4, 7);

  return (
    <section id="blog" className="section-shell relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom,rgba(91,164,217,0.08),transparent_65%)]" />

      <div className="mx-auto max-w-7xl relative">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <p className="eyebrow mb-2">{c.label}</p>
            <h2 className="heading-section mb-2">{title}</h2>
            {subtitle && <p className="text-muted max-w-2xl leading-relaxed">{subtitle}</p>}
            <div className="mt-4 h-1 w-16 gradient-shomal rounded-full" />
          </div>
          <Link href="/blog" className="btn-outline shrink-0">{c.viewAll}</Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 p-1.5 rounded-2xl glass-card w-fit max-w-full overflow-x-auto">
          {BLOG_TABS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all",
                tab === key ? "gradient-shomal text-white shadow-md" : "text-muted hover:bg-[#003b8e]/5",
              )}
            >
              {locale === "en" ? TAB_LABELS[key].en : TAB_LABELS[key].fa}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-[2rem] glass-card">
            <p className="text-muted">{c.empty}</p>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-12 gap-6 mb-6">
              {featured && (
                <div className="lg:col-span-7">
                  <BlogFeaturedCard post={featured} locale={locale} readMore={c.readMore} />
                </div>
              )}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {side.map((post) => (
                  <BlogCard key={post.id} post={post} locale={locale} readMore={c.readMore} variant="horizontal" />
                ))}
                <Link
                  href="/appointments"
                  className="mt-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#003b8e]/25 py-4 text-[#003b8e] font-semibold hover:bg-[#003b8e]/5 transition-colors glass-card"
                >
                  <Calendar className="h-4 w-4" />
                  {c.bookCta}
                </Link>
              </div>
            </div>

            {grid.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {grid.map((post) => (
                  <BlogCard key={post.id} post={post} locale={locale} readMore={c.readMore} variant="compact" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
