"use client";

import HomePageClient from "@/components/home/HomePageClient";
import type { DoctorOut, HomepageBlock, PublicSite } from "@/lib/cms-client";
import type { BlogPostPublic } from "@/lib/api";
import clsx from "clsx";
import { useLocale } from "next-intl";

export type DeviceMode = "mobile" | "tablet" | "desktop";

const DEVICE_WIDTH: Record<DeviceMode, string> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%",
};

type Props = {
  site: PublicSite | null;
  blocks: HomepageBlock[];
  doctors: DoctorOut[];
  posts: BlogPostPublic[];
  device: DeviceMode;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
};

export default function BuilderPreview({
  site,
  blocks,
  doctors,
  posts,
  device,
  selectedBlockId,
  onSelectBlock,
}: Props) {
  const locale = useLocale();
  const previewSite: PublicSite | null = site ? { ...site, homepage_blocks: blocks } : null;

  return (
    <div className="flex justify-center h-full overflow-auto bg-[#d8e4f2] p-3 sm:p-4">
      <div
        className={clsx(
          "bg-white shadow-2xl overflow-hidden transition-all duration-300 origin-top w-full",
          device !== "desktop" && "rounded-[2rem] border-4 border-[#1a1a1a]",
        )}
        style={{ maxWidth: DEVICE_WIDTH[device] }}
      >
        {device !== "desktop" && (
          <div className="h-6 bg-[#1a1a1a] flex items-center justify-center shrink-0">
            <div className="w-16 h-1 rounded-full bg-[#333]" />
          </div>
        )}
        <div
          className="relative overflow-x-hidden min-h-[400px]"
          onClick={(e) => {
            const el = (e.target as HTMLElement).closest("[data-block-id]");
            if (el) onSelectBlock(el.getAttribute("data-block-id")!);
          }}
        >
          <HomePageClient
            site={previewSite}
            doctors={doctors}
            posts={posts}
            locale={locale}
            preview
            selectedBlockId={selectedBlockId}
          />
        </div>
      </div>
    </div>
  );
}
