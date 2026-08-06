import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchBlogPosts } from "@/lib/api";
import BlogListClient from "@/components/blog/BlogListClient";

export const revalidate = 60;

export default async function BlogListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const tNews = await getTranslations("news");

  const { items } = await fetchBlogPosts(undefined, 1, 24);

  return (
    <BlogListClient
      posts={items}
      locale={locale}
      labels={{
        title: t("title"),
        subtitle: t("pageDesc"),
        readMore: t("readMore"),
        viewAll: t("viewAll"),
        empty: t("empty"),
        searchPlaceholder: t("searchPlaceholder"),
        bookCta: tNews("bookAfterReading"),
      }}
    />
  );
}
