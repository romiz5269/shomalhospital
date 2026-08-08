const insuranceBase =
  process.env.NEXT_PUBLIC_INSURANCE_URL ?? "http://127.0.0.1:5004";
const blogBase = process.env.NEXT_PUBLIC_BLOG_URL ?? "http://127.0.0.1:5005";

export type InsurancePublic = {
  id: string;
  code: string;
  name_fa: string;
  name_en?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  sort_order: number;
  is_featured: boolean;
};

export type BlogPostPublic = {
  id: string;
  slug: string;
  title_fa: string;
  title_en?: string | null;
  excerpt_fa?: string | null;
  excerpt_en?: string | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  category?: string | null;
  is_featured: boolean;
  published_at?: string | null;
  view_count: number;
};

export type BlogListResponse = {
  total: number;
  page: number;
  page_size: number;
  items: BlogPostPublic[];
};

export async function fetchFeaturedInsurances(): Promise<InsurancePublic[]> {
  try {
    const res = await fetch(`${insuranceBase}/public`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchAllInsurances(): Promise<InsurancePublic[]> {
  try {
    const res = await fetch(`${insuranceBase}/public/all`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchBlogPosts(
  featured?: boolean,
  page = 1,
  pageSize = 6,
): Promise<BlogListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (featured) params.set("featured", "true");

  try {
    const res = await fetch(`${blogBase}/public/posts?${params}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      return { total: 0, page: 1, page_size: pageSize, items: [] };
    }
    return res.json();
  } catch {
    return { total: 0, page: 1, page_size: pageSize, items: [] };
  }
}

export function localizedField(
  locale: string,
  fa?: string | null,
  en?: string | null,
): string {
  if (locale === "en") return (en && en.trim()) ? en : "";
  return (fa && fa.trim()) ? fa : en ?? "";
}
