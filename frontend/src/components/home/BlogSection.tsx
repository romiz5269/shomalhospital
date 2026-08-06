import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { fetchBlogPosts, localizedField } from "@/lib/api";

export default async function BlogSection({ locale }: { locale: string }) {
  const t = await getTranslations("blog");
  const { items } = await fetchBlogPosts(true, 1, 3);

  return (
    <section id="blog" className="py-16 px-4 lg:px-6 bg-[#f0f4fa]">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-shomal-primary">
            {t("title")}
          </h2>
          <Link
            href="/blog"
            className="rounded-xl border border-shomal-primary/30 px-5 py-2.5 text-sm font-medium text-shomal-primary hover:bg-white transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-gray-500">{t("empty")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <article
                key={post.id}
                className="glass-card rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="relative h-44 bg-shomal-primary/10 overflow-hidden">
                  {post.cover_image_url ? (
                    <Image
                      src={post.cover_image_url}
                      alt={localizedField(
                        locale,
                        post.title_fa,
                        post.title_en,
                      )}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-shomal-primary/40 text-4xl font-bold">
                      ش
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {post.category && (
                    <span className="inline-block rounded-full bg-shomal-primary/10 px-3 py-1 text-xs font-medium text-shomal-primary mb-3">
                      {post.category}
                    </span>
                  )}
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                    {localizedField(locale, post.title_fa, post.title_en)}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {localizedField(
                      locale,
                      post.excerpt_fa,
                      post.excerpt_en,
                    )}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm font-semibold text-shomal-primary hover:underline"
                  >
                    {t("readMore")} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
