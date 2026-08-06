"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { HERO_POSTER, HERO_VIDEO } from "@/lib/config";
import Button from "@/components/ui/Button";

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1631217868264-e176b5486228?auto=format&fit=crop&w=1920&q=80",
];

export default function HeroSlider() {
  const t = useTranslations("hero");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const totalSlides = 1 + SLIDE_IMAGES.length;
  const isVideoSlide = slide === 0;

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

    if (isVideoSlide) {
      if (video.readyState >= 2) void safePlay();
      else {
        const onReady = () => void safePlay();
        video.addEventListener("loadeddata", onReady, { once: true });
        return () => video.removeEventListener("loadeddata", onReady);
      }
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [isVideoSlide, safePlay]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % totalSlides);
    }, 9000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void safePlay();
    else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-shomal-primary">
      {/* Video always mounted — prevents play() interrupted by removal */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${isVideoSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        aria-hidden={!isVideoSlide}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover scale-105"
          muted
          loop
          playsInline
          preload="auto"
          poster={HERO_POSTER}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      </div>

      {SLIDE_IMAGES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${slide === i + 1 ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          aria-hidden={slide !== i + 1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover scale-105" />
        </div>
      ))}

      <div className="absolute inset-0 z-20 bg-gradient-to-l from-[#001533]/92 via-shomal-primary/78 to-shomal-primary/45" />
      <div className="absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_30%_20%,rgba(91,164,217,0.35),transparent_50%)]" />

      {isVideoSlide && (
        <div className="absolute bottom-28 start-6 z-30 flex gap-2">
          <button type="button" onClick={togglePlay} className="hero-control-btn" aria-label="Play pause">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button type="button" onClick={toggleMute} className="hero-control-btn" aria-label="Mute">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      )}

      <div className="absolute bottom-28 end-6 z-30 flex items-center gap-2">
        <button type="button" onClick={() => setSlide((s) => (s - 1 + totalSlides) % totalSlides)} className="hero-control-btn">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${slide === i ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => setSlide((s) => (s + 1) % totalSlides)} className="hero-control-btn">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-30 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 py-24 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm text-white backdrop-blur-md mb-8">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {t("badge")}
            </span>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-[1.12] mb-6 drop-shadow-2xl">
              {t("title")}
            </h1>
            <p className="text-lg sm:text-xl text-white/88 leading-relaxed mb-10 max-w-2xl">
              {t("subtitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/appointments">
                <Button size="lg" variant="secondary" className="min-w-[200px]">
                  <Calendar className="h-5 w-5" />
                  {t("cta")}
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="min-w-[160px]">
                  {t("loginCta")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 h-24 bg-gradient-to-t from-[#eef3fa] to-transparent pointer-events-none" />
    </section>
  );
}
