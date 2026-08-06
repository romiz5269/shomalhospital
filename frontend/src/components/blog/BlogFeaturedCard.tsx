"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import clsx from "clsx";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import { localizedField, type BlogPostPublic } from "@/lib/api";
import { formatBlogDate } from "@/lib/blog-utils";
import CategoryBadge from "@/components/blog/CategoryBadge";

type Props = {
  post: BlogPostPublic;
  locale: string;
  readMore: string;
  size?: "lg" | "md";
};

export default function BlogFeaturedCard({ post, locale, readMore, size = "lg" }: Props) {
  const title = localizedField(locale, post.title_fa, post.title_en);
  const excerpt = localizedField(locale, post.excerpt_fa, post.excerpt_en);
  const date = formatBlogDate(post.published_at, locale);
  const isRtl = locale === "fa";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={clsx(
        "group relative block overflow-hidden rounded-[2rem] glass-card",
        size === "lg" ? "min-h-[420px] lg:min-h-[480px]" : "min-h-[320px]",
      )}
    >
      <div className="absolute inset-0">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width:1024px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="h-full gradient-shomal" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001533]/95 via-[#003b8e]/50 to-[#003b8e]/10" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end p-7 sm:p-10 text-white min-h-[inherit]">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <CategoryBadge category={post.category} locale={locale} onDark />
          {post.is_featured && (
            <span className="rounded-full bg-[#2ec4a0] px-2.5 py-0.5 text-[10px] font-bold">
              {locale === "en" ? "Featured" : "ویژه"}
            </span>
          )}
        </div>
        <h3 className={clsx("font-bold leading-snug mb-3 max-w-2xl", size === "lg" ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl")}>
          {title}
        </h3>
        {excerpt && (
          <p className="text-white/85 line-clamp-2 max-w-2xl mb-5 text-sm sm:text-base leading-relaxed">{excerpt}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-white/70">
            {date && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {date}
              </span>
            )}
            {post.view_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> {post.view_count.toLocaleString(locale === "en" ? "en" : "fa")}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md px-4 py-2 text-sm font-bold group-hover:bg-white/25 transition-colors">
            {readMore}
            <ArrowLeft className={clsx("h-4 w-4 transition-transform group-hover:-translate-x-1", !isRtl && "rotate-180")} />
          </span>
        </div>
      </div>
    </Link>
  );
}
