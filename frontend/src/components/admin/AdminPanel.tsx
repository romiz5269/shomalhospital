"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/context/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  fetchAdminDoctors,
  fetchAdminSite,
  isSiteAdmin,
  updateAdminSite,
  uploadCmsMedia,
  updateHomepageBlocks,
  type DoctorOut,
  type HomepageBlock,
  type PublicSite,
} from "@/lib/cms-client";
import { API } from "@/lib/config";
import { getAccessToken } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Layers,
  Stethoscope,
  Newspaper,
  Loader2,
  Save,
  Shield,
} from "lucide-react";
import clsx from "clsx";
import PageBuilder from "@/components/admin/PageBuilder";
import DoctorsManager from "@/components/admin/DoctorsManager";
import InsurancesManager from "@/components/admin/InsurancesManager";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { BlogPostPublic } from "@/lib/api";
import { Upload, Film } from "lucide-react";

type Tab = "site" | "pages" | "doctors" | "insurances" | "blog";

export default function AdminPanel() {
  const t = useTranslations("admin");
  const locale = useLocale() as "fa" | "en";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("site");
  const [site, setSite] = useState<PublicSite | null>(null);
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [posts, setPosts] = useState<BlogPostPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroVideo, setHeroVideo] = useState("");
  const [heroPoster, setHeroPoster] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [siteData, doctorData] = await Promise.all([
        fetchAdminSite(),
        fetchAdminDoctors(),
      ]);
      setSite(siteData);
      setBlocks([...siteData.homepage_blocks].sort((a, b) => a.order - b.order));
      setHeroTitle(siteData.hero_title_fa);
      setHeroSubtitle(siteData.hero_subtitle_fa || "");
      setHeroVideo(siteData.hero_video_url || "");
      setHeroPoster(siteData.hero_poster_url || "");
      setDoctors(doctorData.items);

      const token = getAccessToken();
      try {
        const postsRes = await fetch(`${API.blog}/admin/posts?page_size=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data.items || []);
        }
      } catch {
        /* blog posts optional for page builder */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg === "CMS_NETWORK_ERROR") {
        setError(
          locale === "fa"
            ? "اتصال به CMS برقرار نشد. گیت‌وی (8080) و blog-service (5005) را اجرا کنید."
            : "Cannot reach CMS. Start gateway (8080) and blog-service (5005).",
        );
      } else if (msg === "CMS_UNAUTHORIZED" || msg === "NOT_AUTHENTICATED") {
        setError(
          locale === "fa"
            ? "نشست منقضی شده — دوباره وارد شوید."
            : "Session expired — please sign in again.",
        );
        router.push("/admin/login");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/admin/login");
      return;
    }
    if (!isSiteAdmin(user)) {
      setLoading(false);
      return;
    }
    void loadAll();
  }, [user, authLoading, router, loadAll]);

  const onSaveSite = async () => {
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateAdminSite({
        hero_title_fa: heroTitle,
        hero_subtitle_fa: heroSubtitle,
        hero_video_url: heroVideo,
        hero_poster_url: heroPoster,
      });
      setSite(updated);
      setMessage(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const onSaveBlocks = async () => {
    setSaving(true);
    setMessage("");
    try {
      const normalized = blocks.map((b, i) => ({ ...b, order: i }));
      const updated = await updateHomepageBlocks(normalized);
      setBlocks(updated.homepage_blocks);
      setMessage(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const onUploadVideo = async (file: File) => {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 80 * 1024 * 1024) {
        throw new Error(locale === "fa" ? "حجم فایل بیش از ۸۰ مگابایت است." : "File exceeds 80MB.");
      }
      const res = await uploadCmsMedia(file);
      if (!res?.url) throw new Error(locale === "fa" ? "آدرس فایل برنگشت." : "Upload returned no URL.");

      const nextVideo = res.media_type === "video" ? res.url : heroVideo;
      const nextPoster = res.media_type === "image" ? res.url : heroPoster;
      if (res.media_type === "video") setHeroVideo(res.url);
      else setHeroPoster(res.url);

      // Persist to DB — CMS URL must win over env/Mixkit fallback on homepage
      const updated = await updateAdminSite({
        hero_title_fa: heroTitle,
        hero_subtitle_fa: heroSubtitle,
        hero_video_url: nextVideo || undefined,
        hero_poster_url: nextPoster || undefined,
      });
      setSite(updated);
      if (updated.hero_video_url) setHeroVideo(updated.hero_video_url);
      if (updated.hero_poster_url) setHeroPoster(updated.hero_poster_url);
      setMessage(
        locale === "fa"
          ? res.media_type === "video"
            ? "ویدیو آپلود و در دیتابیس ذخیره شد ✓ — صفحه اصلی را رفرش کنید."
            : "پوستر آپلود و ذخیره شد ✓"
          : "Media uploaded and saved to CMS ✓",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg === "CMS_NETWORK_ERROR" || msg === "NOT_AUTHENTICATED") {
        setError(
          locale === "fa"
            ? "آپلود ناموفق — وارد CMS شوید و گیت‌وی (8080) + blog (5005) را چک کنید."
            : "Upload failed — sign in and check gateway/CMS.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-shomal-primary" />
      </div>
    );
  }

  if (!user || !isSiteAdmin(user)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-3">
        <p className="text-red-600 font-semibold">{t("accessDenied")}</p>
        <a href="/fa/admin/login" className="inline-flex font-semibold text-shomal-primary hover:underline">
          ورود به CMS
        </a>
      </div>
    );
  }

  const tabs: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "site", icon: LayoutDashboard, label: t("tabs.site") },
    { id: "pages", icon: Layers, label: t("tabs.pages") },
    { id: "doctors", icon: Stethoscope, label: t("tabs.doctors") },
    { id: "insurances", icon: Shield, label: "بیمه‌ها" },
    { id: "blog", icon: Newspaper, label: t("tabs.blog") },
  ];

  return (
    <div className="min-h-screen mesh-bg">
      {tab !== "pages" && (
        <div className="gradient-shomal py-10 px-4 text-white">
          <div className="mx-auto max-w-6xl flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <p className="text-white/85 mt-2">{t("subtitle")}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}

      <div className={clsx(tab === "pages" ? "px-0 py-0" : "mx-auto max-w-6xl px-4 py-8 lg:px-6")}>
        {tab !== "pages" && error && (
          <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}
        {tab !== "pages" && message && (
          <div className="mb-4 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">{message}</div>
        )}

        {tab !== "pages" && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all",
                tab === id
                  ? "gradient-shomal text-white shadow-lg"
                  : "bg-white border border-shomal-border text-gray-700 hover:bg-shomal-primary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        )}

        {tab === "pages" && (
          <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-white border-b border-gray-200 shrink-0">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  tab === id ? "gradient-shomal text-white" : "text-gray-600 hover:bg-gray-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === "pages" && error && (
          <div className="mx-3 mt-2 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        {tab === "pages" && (
          <PageBuilder
            site={site}
            blocks={blocks}
            doctors={doctors}
            posts={posts}
            onBlocksChange={setBlocks}
            onSave={onSaveBlocks}
            saving={saving}
            locale={locale}
          />
        )}

        {tab === "site" && (
          <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-5 max-w-3xl mx-auto w-full min-w-0">
            <div>
              <h2 className="heading-on-glass text-lg sm:text-xl mb-1">بنر ویدیویی صفحه اصلی</h2>
              <p className="text-sm text-muted">ویدیو یا پوستر را آپلود کنید — بلافاصله روی سایت ذخیره می‌شود.</p>
            </div>
            <Input label={t("heroTitle")} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
            <Input label={t("heroSubtitle")} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
            {heroVideo ? (
              <p className="text-xs text-muted break-all" dir="ltr">
                Video: {heroVideo}
              </p>
            ) : (
              <p className="text-xs text-amber-700">No video yet — upload an mp4 below.</p>
            )}
            <Input label="Poster URL" value={heroPoster} onChange={(e) => setHeroPoster(e.target.value)} dir="ltr" readOnly={false} />

            <div className="rounded-2xl border border-dashed border-shomal-primary/30 p-4 sm:p-5 bg-shomal-primary/5">
              <p className="text-sm font-semibold text-shomal-primary mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {uploading ? (locale === "fa" ? "در حال آپلود..." : "Uploading...") : t("uploadVideo")}
              </p>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUploadVideo(f);
                  e.target.value = "";
                }}
                className="block w-full text-sm file:me-3 file:rounded-xl file:border-0 file:bg-[#003b8e] file:px-4 file:py-2 file:text-white file:text-sm file:font-semibold"
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                فرمت: mp4 / webm / mov — حداکثر ۸۰MB — بعد از آپلود خودکار ذخیره می‌شود
              </p>
            </div>

            {heroVideo && (
              <div className="rounded-2xl overflow-hidden border border-shomal-border/60 bg-black">
                <div className="flex items-center gap-2 px-4 py-2 bg-shomal-primary/10 text-sm font-medium text-shomal-primary">
                  <Film className="h-4 w-4" />
                  پیش‌نمایش بنر ویدیویی
                </div>
                <video src={heroVideo} controls className="w-full max-h-56 sm:max-h-72 object-cover" poster={heroPoster || undefined} />
              </div>
            )}

            <Button onClick={onSaveSite} disabled={saving || uploading} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saving ? "..." : t("save")}
            </Button>
          </div>
        )}

        {tab === "doctors" && <DoctorsManager />}

        {tab === "insurances" && <InsurancesManager />}

        {tab === "blog" && (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="glass-premium rounded-2xl p-4 flex justify-between gap-3">
                <div>
                  <p className="font-bold text-shomal-primary">{post.title_fa}</p>
                  <p className="text-xs text-gray-500">{post.slug}</p>
                </div>
                <span className={clsx("text-xs font-semibold px-2 py-1 rounded-full", post.published_at ? "bg-green-100 text-green-800" : "bg-gray-100")}>
                  {post.published_at ? "published" : "draft"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
