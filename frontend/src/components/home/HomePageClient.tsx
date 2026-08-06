"use client";

import HeroNikan from "@/components/home/HeroNikan";
import AppointmentSteps from "@/components/home/AppointmentSteps";
import ElectronicServices from "@/components/home/ElectronicServices";
import StatsBar from "@/components/home/StatsBar";
import InsuranceCarousel from "@/components/home/InsuranceCarousel";
import PopularDoctors from "@/components/home/PopularDoctors";
import AboutSection from "@/components/home/AboutSection";
import NewsTabsSection from "@/components/home/NewsTabsSection";
import FAQSection from "@/components/home/FAQSection";
import AnimatedBlock from "@/components/ui/AnimatedBlock";
import type { DoctorOut, HomepageBlock, PublicSite } from "@/lib/cms-client";
import type { BlogPostPublic } from "@/lib/api";
import clsx from "clsx";

type Props = {
  site: PublicSite | null;
  doctors: DoctorOut[];
  posts: BlogPostPublic[];
  locale: string;
  preview?: boolean;
  selectedBlockId?: string | null;
};

function renderBlockContent(
  block: HomepageBlock,
  site: PublicSite | null,
  doctors: DoctorOut[],
  posts: BlogPostPublic[],
  locale: string,
) {
  const props = block.props ?? {};

  switch (block.type) {
    case "hero":
      return <HeroNikan site={site} />;
    case "appointment_steps":
      return <AppointmentSteps />;
    case "electronic_services":
      return <ElectronicServices />;
    case "stats":
      return <StatsBar stats={props} />;
    case "insurance":
      return <InsuranceCarousel locale={locale} />;
    case "popular_doctors":
      return <PopularDoctors doctors={doctors} blockProps={props} />;
    case "about":
      return <AboutSection blockProps={props} />;
    case "news":
      return <NewsTabsSection initialPosts={posts} blockProps={props} />;
    case "faq":
      return <FAQSection />;
    default:
      return null;
  }
}

export default function HomePageClient({
  site,
  doctors,
  posts,
  locale,
  preview = false,
  selectedBlockId = null,
}: Props) {
  const blocks =
    site?.homepage_blocks?.length
      ? [...site.homepage_blocks].sort((a, b) => a.order - b.order)
      : [
          { id: "hero", type: "hero", enabled: true, order: 0, props: {} },
          { id: "appointment-steps", type: "appointment_steps", enabled: true, order: 1, props: {} },
          { id: "electronic-services", type: "electronic_services", enabled: true, order: 2, props: {} },
          { id: "stats", type: "stats", enabled: true, order: 3, props: {} },
          { id: "insurance", type: "insurance", enabled: true, order: 4, props: {} },
          { id: "popular-doctors", type: "popular_doctors", enabled: true, order: 5, props: {} },
          { id: "about", type: "about", enabled: true, order: 6, props: {} },
          { id: "news", type: "news", enabled: true, order: 7, props: {} },
          { id: "faq", type: "faq", enabled: true, order: 8, props: {} },
        ];

  return (
    <>
      {blocks.map((block) => {
        if (!block.enabled) return null;
        const selected = preview && selectedBlockId === block.id;
        return (
          <AnimatedBlock key={block.id} block={block} preview={preview}>
            <div
              data-block-id={block.id}
              className={clsx(
                "relative transition-all",
                preview && "cursor-pointer hover:outline hover:outline-2 hover:outline-[#003b8e]/30",
                selected && "outline outline-2 outline-[#2ec4a0] outline-offset-[-2px]",
              )}
            >
              {preview && selected && (
                <div className="absolute top-2 start-2 z-30 rounded-lg bg-[#2ec4a0] px-2 py-0.5 text-[10px] font-bold text-white pointer-events-none">
                  {block.type}
                </div>
              )}
              {renderBlockContent(block, site, doctors, posts, locale)}
            </div>
          </AnimatedBlock>
        );
      })}
    </>
  );
}
