import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Calendar, Clock, Eye, ArrowLeft } from "lucide-react";
import { fetchBlogPosts, localizedField } from "@/lib/api";
import { formatBlogDate } from "@/lib/blog-utils";
import CategoryBadge from "@/components/blog/CategoryBadge";
import BlogCard from "@/components/blog/BlogCard";

const blogBase = process.env.NEXT_PUBLIC_BLOG_URL ?? "http://127.0.0.1:5005";

async function fetchPost(slug: string) {
  try {
    const res = await fetch(`${blogBase}/public/posts/${slug}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const post = await fetchPost(slug);
  if (!post) notFound();

  const title = localizedField(locale, post.title_fa, post.title_en);
  const content = localizedField(locale, post.content_fa, post.content_en);
  const excerpt = localizedField(locale, post.excerpt_fa, post.excerpt_en);
  const date = formatBlogDate(post.published_at, locale);
  const isRtl = locale === "fa";

  const { items: allPosts } = await fetchBlogPosts(undefined, 1, 12);
  const related = allPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <article className="min-h-screen section-shell">
      {/* Hero with cover */}
      <div className="relative min-h-[280px] sm:min-h-[360px] overflow-hidden">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 gradient-shomal" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001533]/95 via-[#003b8e]/60 to-[#003b8e]/30" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:py-16 lg:px-8 flex flex-col justify-end min-h-[inherit]">
          <CategoryBadge category={post.category} locale={locale} onDark size="md" />
          <h1 className="text-2xl sm:text-4xl font-bold text-white mt-4 mb-4 leading-tight max-w-3xl">{title}</h1>
          {excerpt && <p className="text-white/85 text-base sm:text-lg max-w-2xl line-clamp-2 mb-5">{excerpt}</p>}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            {date && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {date}
              </span>
            )}
            {post.view_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> {post.view_count.toLocaleString(locale === "en" ? "en" : "fa")} {locale === "en" ? "views" : "بازدید"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8 lg:py-14">
        {post.video_url && (
          <div className="mb-10 rounded-[1.75rem] overflow-hidden glass-card shadow-xl">
            <video controls className="w-full" poster={post.cover_image_url ?? undefined}>
              <source src={post.video_url} />
            </video>
          </div>
        )}

        <div className="glass-premium rounded-[2rem] p-6 sm:p-10 lg:p-12">
          <div className="prose prose-lg max-w-none text-foreground leading-9 whitespace-pre-line text-justify">
            {content || (locale === "en" ? "Content coming soon." : "محتوا به‌زودی منتشر می‌شود.")}
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-2xl btn-outline justify-center sm:justify-start"
          >
            <ArrowLeft className={isRtl ? "" : "rotate-180"} />
            {t("viewAll")}
          </Link>
          <Link
            href="/appointments"
            className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-shomal px-8 py-3 text-white font-bold shadow-lg"
          >
            <Calendar className="h-5 w-5" />
            {locale === "en" ? "Book Appointment" : "رزرو نوبت"}
          </Link>
        </div>

        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-[#003b8e]/10">
            <h2 className="heading-section text-2xl mb-8">
              {locale === "en" ? "Related Articles" : "مطالب مرتبط"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} locale={locale} readMore={t("readMore")} variant="compact" />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
