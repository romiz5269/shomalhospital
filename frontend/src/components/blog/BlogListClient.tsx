"use client";

import { useState } from "react";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Calendar, Newspaper, Search } from "lucide-react";
import { type BlogPostPublic } from "@/lib/api";
import {
  BLOG_TABS,
  TAB_LABELS,
  categoryMatchesTab,
  normalizeCategory,
  type BlogCategory,
} from "@/lib/blog-utils";
import BlogCard from "@/components/blog/BlogCard";
import BlogFeaturedCard from "@/components/blog/BlogFeaturedCard";

type Props = {
  posts: BlogPostPublic[];
  locale: string;
  labels: {
    title: string;
    subtitle: string;
    readMore: string;
    viewAll: string;
    empty: string;
    searchPlaceholder: string;
    bookCta: string;
  };
  showHero?: boolean;
};

export default function BlogListClient({ posts, locale, labels, showHero = true }: Props) {
  const [tab, setTab] = useState<BlogCategory>("all");
  const [query, setQuery] = useState("");

  const filtered = posts.filter((post) => {
    const cat = normalizeCategory(post.category);
    if (!categoryMatchesTab(cat, tab)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      post.title_fa.toLowerCase().includes(q) ||
      (post.title_en?.toLowerCase().includes(q) ?? false) ||
      (post.excerpt_fa?.toLowerCase().includes(q) ?? false)
    );
  });

  const featured = filtered.find((p) => p.is_featured) ?? filtered[0];
  const rest = filtered.filter((p) => p.id !== featured?.id);

  return (
    <div className="min-h-screen section-shell">
      {showHero && (
        <div className="relative overflow-hidden gradient-shomal px-4 py-14 sm:py-20 lg:px-8">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
              <Newspaper className="h-4 w-4" />
              {locale === "en" ? "Media Center" : "مرکز رسانه"}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4">{labels.title}</h1>
            <p className="text-white/85 max-w-2xl text-base sm:text-lg leading-relaxed">{labels.subtitle}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl glass-card flex-1">
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
          <div className="relative sm:w-72 shrink-0">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded-2xl border border-[#003b8e]/15 bg-white/90 py-3 ps-11 pe-4 text-sm outline-none focus:border-[#003b8e] focus:ring-4 focus:ring-[#003b8e]/10"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-[2rem] glass-card">
            <Newspaper className="h-12 w-12 text-[#003b8e]/30 mx-auto mb-4" />
            <p className="text-muted font-medium">{labels.empty}</p>
          </div>
        ) : (
          <>
            {featured && (
              <div className="mb-8">
                <BlogFeaturedCard post={featured} locale={locale} readMore={labels.readMore} />
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} locale={locale} readMore={labels.readMore} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-14 rounded-[2rem] glass-premium p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-start">
          <div>
            <h3 className="heading-section text-xl sm:text-2xl mb-2">
              {locale === "en" ? "Need a medical appointment?" : "نیاز به نوبت پزشکی دارید؟"}
            </h3>
            <p className="text-muted text-sm sm:text-base">
              {locale === "en"
                ? "Book online 24/7 at Shomal Hospital, Amol."
                : "نوبت آنلاین ۲۴ ساعته در بیمارستان شمال آمل."}
            </p>
          </div>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-2xl gradient-shomal px-8 py-4 text-white font-bold shadow-lg shadow-[#003b8e]/20 hover:-translate-y-0.5 transition-transform shrink-0"
          >
            <Calendar className="h-5 w-5" />
            {labels.bookCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
