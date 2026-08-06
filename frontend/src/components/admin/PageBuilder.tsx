"use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import {
  Save,
  Smartphone,
  Tablet,
  Monitor,
  Layers,
  Paintbrush,
  FileText,
  LayoutTemplate,
  Loader2,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DoctorOut, HomepageBlock, PublicSite } from "@/lib/cms-client";
import type { BlogPostPublic } from "@/lib/api";
import {
  PAGE_TEMPLATES,
  applyTemplate,
  createBlock,
} from "@/lib/block-registry";
import BuilderLayerList, { BlockPalette } from "@/components/admin/BuilderLayerList";
import BuilderInspector from "@/components/admin/BuilderInspector";
import BuilderPreview, { type DeviceMode } from "@/components/admin/BuilderPreview";

type Props = {
  site: PublicSite | null;
  blocks: HomepageBlock[];
  doctors: DoctorOut[];
  posts: BlogPostPublic[];
  onBlocksChange: (blocks: HomepageBlock[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  locale: "fa" | "en";
};

type MobilePanel = "layers" | "preview" | "inspector";
type InspectorTab = "content" | "style";

export default function PageBuilder({
  site,
  blocks,
  doctors,
  posts,
  onBlocksChange,
  onSave,
  saving,
  locale,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("preview");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [showTemplates, setShowTemplates] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const isFa = locale === "fa";

  const updateBlockProps = useCallback(
    (id: string, props: Record<string, unknown>) => {
      onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, props } : b)));
    },
    [blocks, onBlocksChange],
  );

  const handleReorder = (next: HomepageBlock[]) => onBlocksChange(next);

  const handleToggle = (id: string) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  };

  const handleDelete = (id: string) => {
    const next = blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i }));
    onBlocksChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const handleAddBlock = (type: string) => {
    const block = createBlock(type, blocks.length);
    onBlocksChange([...blocks, block]);
    setSelectedId(block.id);
  };

  const applyTemplateById = (templateId: string) => {
    const next = applyTemplate(templateId);
    onBlocksChange(next);
    setSelectedId(next[0]?.id ?? null);
    setShowTemplates(false);
  };

  const devices: { id: DeviceMode; icon: typeof Monitor; label: string }[] = [
    { id: "mobile", icon: Smartphone, label: isFa ? "موبایل" : "Mobile" },
    { id: "tablet", icon: Tablet, label: isFa ? "تبلت" : "Tablet" },
    { id: "desktop", icon: Monitor, label: isFa ? "دسکتاپ" : "Desktop" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-[600px] bg-[#eef2f8] -mx-4 -mb-8 sm:-mx-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#060d18] text-white border-b border-white/10 shrink-0">
        <Link href="/admin" className="flex items-center gap-1 text-xs text-white/60 hover:text-white mr-1">
          <ChevronLeft className="h-4 w-4" />
          {isFa ? "بازگشت" : "Back"}
        </Link>
        <div className="h-4 w-px bg-white/20 hidden sm:block" />
        <p className="text-sm font-bold hidden sm:block">
          {isFa ? "سازنده صفحه" : "Page Builder"}
        </p>

        <div className="flex items-center gap-1 ms-auto">
          {devices.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setDevice(id)}
              className={clsx(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                device === id ? "bg-[#003b8e] text-white" : "text-white/60 hover:text-white hover:bg-white/10",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          {isFa ? "قالب‌ها" : "Templates"}
        </button>

        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isFa ? "مشاهده سایت" : "View site"}
        </Link>

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg gradient-shomal px-4 py-1.5 text-xs font-bold disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isFa ? "انتشار" : "Publish"}
        </button>
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden border-b border-gray-200 bg-white shrink-0">
        {([
          { id: "layers" as const, icon: Layers, label: isFa ? "لایه‌ها" : "Layers" },
          { id: "preview" as const, icon: Monitor, label: isFa ? "پیش‌نمایش" : "Preview" },
          { id: "inspector" as const, icon: Paintbrush, label: isFa ? "ویرایش" : "Edit" },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel(id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              mobilePanel === id ? "border-[#003b8e] text-[#003b8e]" : "border-transparent text-gray-500",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left — Layers */}
        <aside
          className={clsx(
            "w-full lg:w-64 xl:w-72 shrink-0 border-e border-gray-200 bg-white flex flex-col overflow-hidden",
            mobilePanel !== "layers" && "hidden lg:flex",
          )}
        >
          <div className="p-3 border-b border-gray-100 shrink-0">
            <p className="text-xs font-bold text-[#003b8e] uppercase tracking-wide mb-2">
              {isFa ? "افزودن بلوک" : "Add Widget"}
            </p>
            <BlockPalette onAdd={handleAddBlock} locale={locale} />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-bold text-[#003b8e] uppercase tracking-wide mb-2">
              {isFa ? "لایه‌ها — درگ کنید" : "Layers — drag to reorder"}
            </p>
            <BuilderLayerList
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={handleReorder}
              onToggle={handleToggle}
              onDelete={handleDelete}
              locale={locale}
            />
          </div>
        </aside>

        {/* Center — Preview */}
        <main
          className={clsx(
            "flex-1 overflow-hidden min-w-0",
            mobilePanel !== "preview" && "hidden lg:block",
          )}
        >
          <BuilderPreview
            site={site}
            blocks={blocks}
            doctors={doctors}
            posts={posts}
            device={device}
            selectedBlockId={selectedId}
            onSelectBlock={setSelectedId}
          />
        </main>

        {/* Right — Inspector */}
        <aside
          className={clsx(
            "w-full lg:w-72 xl:w-80 shrink-0 border-s border-gray-200 bg-white flex flex-col overflow-hidden",
            mobilePanel !== "inspector" && "hidden lg:flex",
          )}
        >
          <div className="flex border-b border-gray-100 shrink-0">
            {([
              { id: "content" as const, icon: FileText, label: isFa ? "محتوا" : "Content" },
              { id: "style" as const, icon: Paintbrush, label: isFa ? "استایل" : "Style" },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setInspectorTab(id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors",
                  inspectorTab === id ? "border-[#003b8e] text-[#003b8e]" : "border-transparent text-gray-500",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            <BuilderInspector
              block={selectedBlock}
              onChange={(props) => selectedId && updateBlockProps(selectedId, props)}
              locale={locale}
              panel={inspectorTab}
            />
          </div>
        </aside>
      </div>

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#003b8e] text-lg">
                  {isFa ? "قالب‌های آماده" : "Page Templates"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isFa ? "انتخاب قالب — سفارشی‌سازی ۰٪ تا ۱۰۰٪" : "Pick a template — customize 0% to 100%"}
                </p>
              </div>
              <button type="button" onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-700 text-xl px-2">×</button>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              {PAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplateById(tpl.id)}
                  className="text-start rounded-2xl border border-gray-200 overflow-hidden hover:border-[#003b8e] hover:shadow-lg transition-all group"
                >
                  <div
                    className="h-24 flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: tpl.thumbnail }}
                  >
                    {tpl.id}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-[#0a1628] group-hover:text-[#003b8e]">
                      {isFa ? tpl.nameFa : tpl.nameEn}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {isFa ? tpl.descriptionFa : tpl.descriptionEn}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full gradient-shomal rounded-full"
                          style={{ width: `${tpl.customLevel}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#003b8e]">{tpl.customLevel}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
