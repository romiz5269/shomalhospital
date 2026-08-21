"use client";

import { Panel, SectionTitle, Badge } from "@/components/ui";
import { Asset, InventoryItem, ITOverview, PMVisit } from "@/lib/api";
import { JalaliDate } from "@/components/JalaliDateTimeInput";
import { workTypeLabel } from "@/lib/workLabels";
import { Radar } from "lucide-react";

function assetName(assets: Asset[], id?: number) {
  if (!id) return "—";
  return assets.find((a) => a.id === id)?.name || `تجهیز #${id}`;
}

function parseServices(assets: Asset[]) {
  const rows: { asset: Asset; name: string; down: boolean }[] = [];
  for (const a of assets) {
    if (!a.services_info) continue;
    for (const line of a.services_info.replace(/,/g, "\n").split("\n")) {
      const raw = line.trim();
      if (!raw) continue;
      const down = raw.toLowerCase().startsWith("down:") || raw.startsWith("🔴");
      const name = raw.replace(/^down:/i, "").replace(/^🔴\s*/, "").trim();
      rows.push({ asset: a, name, down });
    }
  }
  return rows;
}

export function ITOverviewPanel({
  data,
  visits,
  inventory,
  assets,
}: {
  data: ITOverview;
  visits: PMVisit[];
  inventory: InventoryItem[];
  assets: Asset[];
  onRefresh?: () => void;
}) {
  const services = parseServices(assets);

  return (
    <Panel className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Radar size={18} className="text-[#003b8e]" strokeWidth={2.25} />
        <SectionTitle>مرکز IT</SectionTitle>
      </div>

      <h3 className="font-black text-[#003b8e] mb-3 text-sm">سرویس‌ها و تعمیرات — جزئیات کامل</h3>
      <div className="table-wrap rounded-2xl border border-[#c8d9ee] overflow-auto max-h-[70vh]">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="sticky top-0 bg-[#f4f7fb] z-10">
            <tr className="border-b border-[#d5e3f2] text-muted">
              <th className="p-3 text-right font-medium">نوع</th>
              <th className="p-3 text-right font-medium">تجهیز / کالا</th>
              <th className="p-3 text-right font-medium">تاریخ</th>
              <th className="p-3 text-right font-medium">توضیحات</th>
              <th className="p-3 text-right font-medium">کارهای انجام‌شده</th>
              <th className="p-3 text-right font-medium">مسئول</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => {
              const isAdhoc = v.work_type === "adhoc";
              const done = (v.tasks || []).filter((t) => t.is_done);
              const pending = (v.tasks || []).filter((t) => !t.is_done);
              return (
                <tr key={`v-${v.id}`} className="border-b border-[#d5e3f2]/60 align-top">
                  <td className="p-3">
                    <Badge variant={isAdhoc ? "warning" : "success"}>{workTypeLabel(v.work_type)}</Badge>
                  </td>
                  <td className="p-3 font-bold text-[#003b8e]">
                    {assetName(assets, v.asset_id)}
                    {(v.title || v.recipient_name) && (
                      <span className="block text-xs font-bold text-[#3d5470] mt-1">
                        {v.title || v.recipient_name}
                        {v.recipient_unit ? ` · ${v.recipient_unit}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs">
                    <JalaliDate value={v.visit_date} />
                    {v.return_date && (
                      <span className="block text-[#6b8299]">تحویل: <JalaliDate value={v.return_date} /></span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-[#0a1628] whitespace-pre-wrap leading-relaxed">
                    {v.notes || "—"}
                    {v.alert_description && (
                      <span className="block mt-1 text-[#6b8299]">هشدار: {v.alert_description}</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {(v.tasks || []).length === 0 ? (
                      <span className="text-[#6b8299]">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {done.map((t, i) => (
                          <li key={`d-${v.id}-${i}`} className="text-emerald-800">
                            ✓ {t.task_name}{t.notes ? ` — ${t.notes}` : ""}
                          </li>
                        ))}
                        {pending.map((t, i) => (
                          <li key={`p-${v.id}-${i}`} className="text-amber-800">
                            ○ {t.task_name}{t.notes ? ` — ${t.notes}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="p-3 text-xs font-bold">{v.performed_by || "—"}</td>
                </tr>
              );
            })}

            {services.map((s, i) => (
              <tr key={`svc-${s.asset.id}-${i}`} className="border-b border-[#d5e3f2]/60 align-top">
                <td className="p-3">
                  <Badge variant={s.down ? "critical" : "success"}>{s.down ? "سرویس Down" : "سرویس"}</Badge>
                </td>
                <td className="p-3 font-bold text-[#003b8e]">{s.asset.hostname || s.asset.name}</td>
                <td className="p-3 text-xs text-[#6b8299]">—</td>
                <td className="p-3 text-xs whitespace-pre-wrap">{s.asset.services_info || s.name}</td>
                <td className="p-3 text-xs">{s.down ? `🔴 ${s.name}` : `🟢 ${s.name}`}</td>
                <td className="p-3 text-xs">{s.asset.assigned_to || "—"}</td>
              </tr>
            ))}

            {inventory.map((item) => (
              <tr key={`inv-${item.id}`} className="border-b border-[#d5e3f2]/60 align-top bg-amber-50/40">
                <td className="p-3"><Badge variant="warning">تجهیزات</Badge></td>
                <td className="p-3 font-bold text-[#003b8e]">
                  {item.asset_id ? assetName(assets, item.asset_id) : item.name}
                  {item.asset_id && (
                    <span className="block text-xs font-bold text-[#3d5470] mt-1">{item.name}</span>
                  )}
                  {item.serial_number && <span className="block text-xs font-mono text-[#6b8299]">{item.serial_number}</span>}
                </td>
                <td className="p-3 whitespace-nowrap text-xs">
                  <JalaliDate value={item.received_date} />
                  {item.installed_date && (
                    <span className="block text-[#6b8299]">نصب: <JalaliDate value={item.installed_date} /></span>
                  )}
                </td>
                <td className="p-3 text-xs whitespace-pre-wrap leading-relaxed">
                  {[item.purpose, item.notes].filter(Boolean).join("\n") || "—"}
                </td>
                <td className="p-3 text-xs">
                  {item.status === "installed" ? "نصب / تعویض انجام شده" : "در انتظار نصب / تعویض"}
                  {item.quantity ? ` · تعداد ${item.quantity}` : ""}
                </td>
                <td className="p-3 text-xs">{item.asset_id ? assetName(assets, item.asset_id) : "—"}</td>
              </tr>
            ))}

            {visits.length === 0 && services.length === 0 && inventory.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#6b8299] font-bold">هنوز سرویس یا تعمیری ثبت نشده</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.recent_events.length > 0 && (
        <ul className="space-y-2 text-sm mt-5">
          {data.recent_events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-2 gap-y-1 text-[#3d5470] border-b border-[#eef3f9] pb-2">
              <span className="text-xs text-[#6b8299]"><JalaliDate value={e.created_at} time /></span>
              <span className="font-bold text-[#0a1628]">{e.user_name}</span>
              <span>{e.action}</span>
              {e.details && <span className="text-[#6b8299]">— {e.details}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
