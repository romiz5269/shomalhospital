import { setRequestLocale } from "next-intl/server";
import HomePageClient from "@/components/home/HomePageClient";
import { fetchPublicDoctors, fetchPublicSite } from "@/lib/cms-client";
import { fetchBlogPosts } from "@/lib/api";

export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [site, doctorsRes, postsRes] = await Promise.all([
    fetchPublicSite(),
    fetchPublicDoctors({ featured: true }).catch(() => ({ total: 0, items: [] })),
    fetchBlogPosts(undefined, 1, 12).catch(() => ({ total: 0, page: 1, page_size: 12, items: [] })),
  ]);

  return (
    <HomePageClient
      site={site}
      doctors={doctorsRes.items}
      posts={postsRes.items}
      locale={locale}
    />
  );
}
