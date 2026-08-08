"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Calendar, Stethoscope } from "lucide-react";
import { useLocale } from "next-intl";
import { fetchPublicSite, type PublicSite } from "@/lib/cms-client";
import { HERO_POSTER } from "@/lib/config";

type Props = {
  site: PublicSite | null;
};

const COPY = {
  fa: {
    badge: "مرکز فوق‌تخصصی درمان در آمل، مازندران",
    title: "شمال، خانه‌ی سلامت شماست",
    subtitle:
      "بیش از دو دهه مراقبت تخصصی، با تیمی از پزشکان مجرب، تجهیزات پیشرفته و فضایی آرام برای شما و خانواده‌تان.",
    cta: "نوبت‌دهی آنلاین",
    ctaDoctors: "پزشکان ما",
  },
  en: {
    badge: "Specialty care center in Amol, Mazandaran",
    title: "Shomal — your home for health",
    subtitle:
      "Over two decades of specialty care with expert physicians, modern equipment, and a calm environment for your family.",
    cta: "Book Appointment",
    ctaDoctors: "Our Doctors",
  },
} as const;

/** Prefer CMS uploads; never treat Mixkit or local Windows paths as saved video. */
function resolveCmsVideo(url?: string | null): string {
  const v = (url || "").trim();
  if (!v) return "";
  if (v.includes("mixkit.co") || v.includes("assets.mixkit")) return "";
  if (/^[a-zA-Z]:[\\/]/.test(v) || v.includes("Downloads")) return "";
  // Same-origin proxy on the Next app — avoids localhost vs 127.0.0.1 / CORS / CORP breaks
  const marker = "/uploads/";
  const idx = v.indexOf(marker);
  if (idx !== -1) {
    const name = v.slice(idx + marker.length).split("?")[0].replace(/^\/+/, "");
    if (name && !name.includes("..")) return `/cms-media/uploads/${name}`;
  }
  if (v.startsWith("/cms-media/")) return v;
  return "";
}

export default function HeroSection({ site }: Props) {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState<PublicSite | null>(site);

  useEffect(() => {
    setLive(site);
  }, [site]);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicSite().then((fresh) => {
      if (!cancelled && fresh) setLive(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // CMS DB wins — never fall back to hardcoded Mixkit after a saved upload
  const videoUrl =
    resolveCmsVideo(live?.hero_video_url) || resolveCmsVideo(site?.hero_video_url) || "";
  const posterUrl = live?.hero_poster_url?.trim() || site?.hero_poster_url?.trim() || HERO_POSTER;
  const title =
    locale === "en"
      ? live?.hero_title_en || site?.hero_title_en || c.title
      : live?.hero_title_fa || site?.hero_title_fa || c.title;
  const subtitle =
    locale === "en"
      ? live?.hero_subtitle_en || site?.hero_subtitle_en || c.subtitle
      : live?.hero_subtitle_fa || site?.hero_subtitle_fa || c.subtitle;
  const badge =
    locale === "en"
      ? live?.hero_badge_en || site?.hero_badge_en || c.badge
      : live?.hero_badge_fa || site?.hero_badge_fa || c.badge;

  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    try {
      video.muted = true;
      await video.play();
    } catch {
      /* autoplay may be blocked */
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (video.readyState >= 2) void safePlay();
    else {
      const onReady = () => void safePlay();
      video.addEventListener("loadeddata", onReady, { once: true });
      return () => video.removeEventListener("loadeddata", onReady);
    }
  }, [safePlay, videoUrl]);

  return (
    <section className="hero-mobile">
      {videoUrl ? (
        <video
          key={videoUrl}
          ref={videoRef}
          className="hero-mobile__media"
          src={videoUrl}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          poster={posterUrl}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" className="hero-mobile__media object-cover" />
      )}

      <div className="hero-mobile__shade" aria-hidden />

      <div className="hero-mobile__inner">
        <div className="hero-mobile__copy">
          <p className="hero-mobile__badge">
            <span>{badge}</span>
          </p>
          <h1 className="hero-mobile__title">{title}</h1>
          <p className="hero-mobile__subtitle">{subtitle}</p>
          <div className="hero-mobile__actions">
            <Link href="/#appointment-flow" className="hero-mobile__btn hero-mobile__btn--primary">
              <Calendar className="h-5 w-5 shrink-0" />
              <span>{c.cta}</span>
            </Link>
            <Link href="/#doctors" className="hero-mobile__btn hero-mobile__btn--ghost">
              <Stethoscope className="h-5 w-5 shrink-0" />
              <span>{c.ctaDoctors}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
