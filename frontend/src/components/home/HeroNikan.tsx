"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Calendar, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useLocale } from "next-intl";
import type { PublicSite } from "@/lib/cms-client";
import { HERO_POSTER, HERO_VIDEO } from "@/lib/config";

type Props = {
  site: PublicSite | null;
};

const COPY = {
  fa: {
    title: "در ستایش زندگی...",
    subtitle:
      "بیمارستان تخصصی و فوق‌تخصصی شمال در آمل؛ تجهیزات پیشرفته، کادر مجرب و خدمات ۲۴ ساعته.",
    cta: "رزرو نوبت آنلاین",
    badge: "بیمارستان تخصصی شمال — آمل",
  },
  en: {
    title: "In praise of life...",
    subtitle:
      "Shomal Hospital in Amol — advanced specialty care with modern facilities and 24/7 services.",
    cta: "Book Appointment",
    badge: "Shomal Hospital — Amol",
  },
} as const;

export default function HeroNikan({ site }: Props) {
  const locale = useLocale();
  const c = locale === "en" ? COPY.en : COPY.fa;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const videoUrl = site?.hero_video_url || HERO_VIDEO;
  const posterUrl = site?.hero_poster_url || HERO_POSTER;
  const title =
    locale === "en" ? site?.hero_title_en || c.title : site?.hero_title_fa || c.title;
  const subtitle =
    locale === "en" ? site?.hero_subtitle_en || c.subtitle : site?.hero_subtitle_fa || c.subtitle;
  const badge =
    locale === "en"
      ? site?.hero_badge_en || c.badge
      : site?.hero_badge_fa || c.badge;

  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = muted;
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 2) void safePlay();
    else {
      const onReady = () => void safePlay();
      video.addEventListener("loadeddata", onReady, { once: true });
      return () => video.removeEventListener("loadeddata", onReady);
    }
  }, [safePlay, videoUrl]);

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#001533] min-h-[100svh] h-[100svh]">
      <video
        key={videoUrl}
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        poster={posterUrl}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_top,rgba(0,6,20,0.98)_8%,rgba(0,10,28,0.88)_50%,rgba(0,14,36,0.45)_100%)] md:bg-[linear-gradient(270deg,rgba(0,8,24,0.94)_0%,rgba(0,15,40,0.7)_45%,rgba(0,20,50,0.25)_75%,transparent_100%)]"
        aria-hidden
      />

      <div className="absolute bottom-[4.75rem] inset-inline-start-3 z-30 flex gap-2 sm:bottom-24 sm:inset-inline-start-5">
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) void safePlay();
            else {
              v.pause();
              setPlaying(false);
            }
          }}
          className="hero-control-btn"
          aria-label="Play pause"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          className="hero-control-btn"
          aria-label="Mute"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative z-20 box-border flex h-full w-full max-w-[100vw] items-end px-4 pb-14 pt-24 sm:px-6 sm:pb-20 md:items-center md:px-10 md:pb-16">
        <div className="mx-auto w-full max-w-7xl min-w-0">
          <div className="w-full min-w-0 max-w-xl md:ms-auto md:me-0">
            <span className="mb-3 inline-flex max-w-full items-center rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] text-white backdrop-blur-md sm:mb-5 sm:text-sm">
              <span className="truncate">{badge}</span>
            </span>
            <h1 className="mb-3 break-words text-[clamp(1.4rem,6vw,3.25rem)] font-bold leading-[1.25] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] sm:mb-5">
              {title}
            </h1>
            <p className="mb-5 line-clamp-3 break-words text-[13px] leading-6 text-white/90 sm:mb-8 sm:line-clamp-none sm:text-base sm:leading-7 md:text-lg">
              {subtitle}
            </p>
            <Link
              href="/#appointment-flow"
              className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-2xl bg-[#2ec4a0] px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(46,196,160,0.35)] transition-transform active:scale-[0.98] sm:w-auto sm:px-9 sm:py-4 sm:text-base"
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <span className="truncate">{c.cta}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
