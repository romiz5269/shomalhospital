"use client";

import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import { localizedField, type BlogPostPublic } from "@/lib/api";
import { formatBlogDate } from "@/lib/blog-utils";
import CategoryBadge from "@/components/blog/CategoryBadge";

type Props = {
  post: BlogPostPublic;
  locale: string;
  readMore: string;
  variant?: "compact" | "standard" | "horizontal";
};

export default function BlogCard({ post, locale, readMore, variant = "standard" }: Props) {
  const title = localizedField(locale, post.title_fa, post.title_en);
  const excerpt = localizedField(locale, post.excerpt_fa, post.excerpt_en);
  const date = formatBlogDate(post.published_at, locale);
  const isRtl = locale === "fa";

  if (variant === "horizontal") {
    return (
      <Link href={`/blog/${post.slug}`} className="group flex gap-4 rounded-2xl glass-card p-4 hover:-translate-y-0.5 transition-all">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl">
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="112px" />
          ) : (
            <div className="flex h-full items-center justify-center gradient-shomal text-white text-xl font-bold">ش</div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <CategoryBadge category={post.category} locale={locale} />
          <h4 className="heading-card text-sm sm:text-base mt-2 line-clamp-2 group-hover:text-[#1a56b8] transition-colors">{title}</h4>
          {date && (
            <p className="text-[11px] text-muted mt-auto pt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {date}
            </p>
          )}
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/blog/${post.slug}`} className="group block rounded-2xl glass-card overflow-hidden hover:-translate-y-1 transition-all">
        <div className="relative h-36 overflow-hidden">
          {post.cover_image_url ? (
            <Image src={post.cover_image_url} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="300px" />
          ) : (
            <div className="h-full gradient-shomal flex items-center justify-center text-white text-3xl font-bold">ش</div>
          )}
          <div className="absolute top-3 start-3">
            <CategoryBadge category={post.category} locale={locale} />
          </div>
        </div>
        <div className="p-4">
          <h4 className="heading-card text-sm line-clamp-2 mb-2">{title}</h4>
          <span className="text-xs font-semibold text-[#003b8e] flex items-center gap-1">
            {readMore}
            <ArrowLeft className={clsx("h-3 w-3", !isRtl && "rotate-180")} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col h-full rounded-[1.75rem] glass-card overflow-hidden hover:-translate-y-1 transition-all">
      <div className="relative h-48 sm:h-52 overflow-hidden">
        {post.cover_image_url ? (
          <Image src={post.cover_image_url} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width:768px) 100vw, 33vw" />
        ) : (
          <div className="h-full gradient-shomal flex items-center justify-center text-white text-4xl font-bold">ش</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001533]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-4 start-4">
          <CategoryBadge category={post.category} locale={locale} />
        </div>
        {post.is_featured && (
          <span className="absolute top-4 end-4 rounded-full bg-[#2ec4a0] px-2.5 py-0.5 text-[10px] font-bold text-white">
            {locale === "en" ? "Featured" : "ویژه"}
          </span>
        )}
      </div>
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h3 className="heading-card text-base sm:text-lg line-clamp-2 mb-2 group-hover:text-[#1a56b8] transition-colors">{title}</h3>
        {excerpt && <p className="text-sm text-muted line-clamp-3 mb-4 flex-1 leading-relaxed">{excerpt}</p>}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#003b8e]/10">
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {date}
              </span>
            )}
            {post.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {post.view_count}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-[#003b8e] flex items-center gap-1 shrink-0">
            {readMore}
            <ArrowLeft className={clsx("h-3.5 w-3.5", !isRtl && "rotate-180")} />
          </span>
        </div>
      </div>
    </Link>
  );
}
