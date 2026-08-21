"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, StatusLight, EmptyState, Badge, Panel, Modal, FormField } from "@/components/ui";
import { api, Reminder, getToken } from "@/lib/api";
import { Bell, Info, Plus, Zap } from "lucide-react";
import { JalaliDate, JalaliDateTimeInput } from "@/components/JalaliDateTimeInput";
import { nowIsoWithTime } from "@/lib/dates";
import { runNotificationTest } from "@/lib/notifications";

const typeLabels: Record<string, string> = {
  windows_activation: "فعال‌سازی ویندوز",
  maintenance: "تعمیرات دوره‌ای",
  license: "گارانتی / لایسنس",
  custom: "سفارشی",
};

export default function RemindersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Reminder[]>([]);
  const [modal, setModal] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: nowIsoWithTime(),
    warning_days: 0,
    interval_days: "" as string | number,
  });

  const load = () => api.reminders.list().then(setItems);

  const runTest = async () => {
    setTesting(true);
    setTestMsg("");
    try {
      const msg = await runNotificationTest();
      setTestMsg(msg);
      load();
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "خطا در تست");
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load();
  }, [router]);

  const saveManual = async () => {
    const title = form.title.trim() || `یادآوری ${new Date(form.due_date).toLocaleString("fa-IR")}`;
    await api.reminders.create({
      title,
      description: form.description || undefined,
      reminder_type: "custom",
      due_date: new Date(form.due_date).toISOString(),
      warning_days: Number(form.warning_days),
      interval_days: form.interval_days ? Number(form.interval_days) : undefined,
      source: "manual",
    });
    setModal(false);
    setForm({ title: "", description: "", due_date: nowIsoWithTime(), warning_days: 0, interval_days: "" });
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="هشدارها"
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={runTest} disabled={testing}>
              <Zap size={16} className="ml-1" /> {testing ? "..." : "تست هشدار"}
            </Btn>
            <Btn onClick={() => setModal(true)}><Plus size={16} className="ml-1" /> افزودن هشدار</Btn>
          </div>
        }
      />

      <Panel className="mb-6 flex items-start gap-3 bg-[#eef4fb]">
        <Info size={20} className="text-[#003b8e] shrink-0 mt-0.5" strokeWidth={2.25} />
        <div className="text-sm font-bold text-[#3d5470] leading-relaxed space-y-2">
          <p>
            هشدارهای خودکار: اکتیو ویندوز (۱۸۰ روز)، موعد تعمیرات، کالای نصب‌نشده، گارانتی.
            با «افزودن هشدار» می‌توانید یادآوری دستی با تاریخ و ساعت بسازید.
          </p>
          <p className="text-xs text-[#6b8299]">
            برای اطمینان: «تست هشدار» → اعلان فوری + هشدار آزمایشی ۹۰ ثانیه بعد. اول «فعال‌سازی اعلان» را در بنر بالای صفحه بزنید.
          </p>
          {testMsg && <p className="text-[#003b8e] font-black">{testMsg}</p>}
        </div>
      </Panel>

      {items.length === 0 ? (
        <EmptyState message="هشدار فعالی وجود ندارد — همه چیز مرتب است" />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card-elevated p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 border-[#c8d9ee]">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <StatusLight status={r.status} />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-black text-[#003b8e]">{r.title}</h3>
                    <Badge variant={r.status === "critical" ? "critical" : r.status === "warning" ? "warning" : "default"}>
                      {typeLabels[r.reminder_type] || r.reminder_type}
                    </Badge>
                    {r.source === "manual" && <Badge variant="default">دستی</Badge>}
                  </div>
                  {r.description && <p className="text-sm font-bold text-[#3d5470] mt-1">{r.description}</p>}
                  <p className="text-xs font-bold text-[#6b8299] mt-2 flex items-center gap-1">
                    <Bell size={12} /> موعد: <JalaliDate value={r.due_date} time />
                    {r.interval_days ? ` · تکرار هر ${r.interval_days} روز` : ""}
                  </p>
                </div>
              </div>
              <Btn variant="accent" onClick={() => api.reminders.resolve(r.id).then(load)} className="shrink-0 !rounded-2xl">
                حل شد ✓
              </Btn>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="افزودن هشدار دستی">
        <FormField label="عنوان (خالی = خودکار)">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً تمدید لایسنس آنتی‌ویروس" />
        </FormField>
        <FormField label="توضیح">
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
        <FormField label="تاریخ و ساعت موعد (شمسی)">
          <JalaliDateTimeInput withTime value={form.due_date} onChange={(iso) => setForm({ ...form, due_date: iso || form.due_date })} required />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="زرد شدن (روز قبل) — ۰ = فقط همان ساعت">
            <input type="number" min={0} max={365} value={form.warning_days} onChange={(e) => setForm({ ...form, warning_days: Number(e.target.value) })} />
          </FormField>
          <FormField label="تکرار (روز) — اختیاری">
            <input type="number" min={1} placeholder="مثلاً 30 برای ماهانه" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} />
          </FormField>
        </div>
        <div className="flex gap-3 mt-4">
          <Btn onClick={saveManual}>ذخیره</Btn>
          <Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn>
        </div>
      </Modal>
    </AppLayout>
  );
}
