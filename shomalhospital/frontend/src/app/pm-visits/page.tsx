"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Modal, FormField, EmptyState, Badge } from "@/components/ui";
import { api, Asset, PMVisit, PMChecklistTemplate, PMVisitTask, getToken } from "@/lib/api";
import { nowISO, addDaysIso, todayIso } from "@/lib/dates";
import { JalaliDateTimeInput, JalaliDate } from "@/components/JalaliDateTimeInput";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { CheckSquare, Square } from "lucide-react";
import { WORK_MODULE, workTypeLabel } from "@/lib/workLabels";

type WorkTypeFilter = "all" | "pm" | "adhoc";

const emptyVisit = (): Partial<PMVisit> & { tasks: PMVisitTask[] } => ({
  visit_date: nowISO(),
  recipient_name: "",
  recipient_unit: "",
  performed_by: "",
  work_type: "pm",
  alert_warning_days: 30,
  tasks: [],
});

export default function PMVisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<PMVisit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<PMChecklistTemplate[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyVisit());
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkTypeFilter>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const load = () => {
    const params = typeFilter === "all" ? undefined : { work_type: typeFilter };
    api.pmVisits.list(params).then(setVisits);
    api.assets.list().then(setAssets);
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load();
  }, [router, typeFilter]);

  useEffect(() => {
    const readQuery = () => {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q");
      if (q) setFilter(q);
      setHighlightId(sp.get("id"));
    };
    readQuery();
    window.addEventListener("popstate", readQuery);
    window.addEventListener("pm-url-change", readQuery);
    return () => {
      window.removeEventListener("popstate", readQuery);
      window.removeEventListener("pm-url-change", readQuery);
    };
  }, []);

  useEffect(() => {
    if (!highlightId || visits.length === 0) return;
    document.getElementById(`visit-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [visits, highlightId]);

  const assetName = (id?: number) => assets.find((a) => a.id === id)?.name || "—";
  const unitLabel = (v: PMVisit) => v.recipient_unit || "—";
  const isPmForm = (form.work_type || "pm") === "pm";

  const filtered = visits.filter((v) => {
    if (!filter) return true;
    const asset = v.asset_id ? assetName(v.asset_id) : "";
    return (
      v.recipient_name?.includes(filter) ||
      v.recipient_unit?.includes(filter) ||
      v.performed_by?.includes(filter) ||
      v.notes?.includes(filter) ||
      v.title?.includes(filter) ||
      asset.includes(filter)
    );
  });

  const loadTemplates = async (assetType?: string, assetNameStr?: string) => {
    const category = assetNameStr?.toUpperCase().includes("HIS") ? "his" : assetType || "general";
    let t = await api.pmVisits.templates(category);
    if (t.length === 0 && category === "his") t = await api.pmVisits.templates("server");
    setTemplates(t);
    return t;
  };

  const openCreate = async (workType: "pm" | "adhoc" = "pm") => {
    setEditId(null);
    const t = workType === "pm" ? await loadTemplates("pc") : [];
    const visitDate = todayIso();
    setForm({
      ...emptyVisit(),
      work_type: workType,
      visit_date: visitDate,
      next_pm_date: workType === "pm" ? addDaysIso(visitDate, 90) : undefined,
      tasks: workType === "pm" ? t.map((x) => ({ task_name: x.name, is_done: false })) : [],
    });
    setModal(true);
  };

  const openEdit = (v: PMVisit) => {
    setEditId(v.id);
    setForm({
      ...v,
      work_type: v.work_type || "pm",
      tasks: v.tasks.map((t) => ({ ...t })),
    });
    setModal(true);
  };

  const onAssetChange = async (assetId: number | undefined) => {
    if (!isPmForm) {
      setForm((f) => ({ ...f, asset_id: assetId }));
      return;
    }
    const asset = assets.find((a) => a.id === assetId);
    const t = await loadTemplates(asset?.asset_type, asset?.name);
    setForm((f) => ({
      ...f,
      asset_id: assetId,
      tasks: t.map((x) => {
        const existing = f.tasks?.find((task) => task.task_name === x.name);
        return existing || { task_name: x.name, is_done: false };
      }),
    }));
  };

  const onWorkTypeChange = async (wt: "pm" | "adhoc") => {
    if (wt === "adhoc") {
      setForm((f) => ({
        ...f,
        work_type: wt,
        tasks: [],
        next_pm_date: undefined,
        alert_title: undefined,
        alert_description: undefined,
      }));
      return;
    }
    const t = await loadTemplates("pc");
    const visitDate = form.visit_date || todayIso();
    setForm((f) => ({
      ...f,
      work_type: wt,
      next_pm_date: f.next_pm_date || addDaysIso(visitDate, 90),
      tasks: t.map((x) => ({ task_name: x.name, is_done: false })),
    }));
  };

  const toggleTask = (idx: number) => {
    setForm((f) => ({
      ...f,
      tasks: f.tasks?.map((t, i) => (i === idx ? { ...t, is_done: !t.is_done } : t)) || [],
    }));
  };

  const save = async () => {
    const receivedDate = form.visit_date ? new Date(form.visit_date).toISOString() : nowISO();
    const returnDate = form.return_date ? new Date(form.return_date).toISOString() : undefined;
    const baseForNext = returnDate || receivedDate;
    const isPm = (form.work_type || "pm") === "pm";
    const nextPm = isPm
      ? form.next_pm_date
        ? new Date(form.next_pm_date).toISOString()
        : addDaysIso(baseForNext, 90)
      : undefined;
    const payload = {
      ...form,
      visit_date: receivedDate,
      return_date: returnDate,
      recipient_unit: form.recipient_unit?.trim() || undefined,
      department_id: undefined,
      next_pm_date: nextPm,
      alert_title: isPm ? form.alert_title?.trim() || undefined : undefined,
      alert_description: isPm ? form.alert_description?.trim() || undefined : undefined,
      alert_warning_days: isPm ? form.alert_warning_days || 30 : undefined,
      work_type: form.work_type || "pm",
      title: form.title?.trim() || undefined,
      tasks: isPm ? form.tasks : [],
    };
    if (editId) {
      await api.pmVisits.update(editId, payload);
      setModal(false);
    } else {
      const created = await api.pmVisits.create(payload);
      setEditId(created.id);
      setForm({ ...created, tasks: created.tasks.map((t) => ({ ...t })) });
    }
    load();
  };

  const doneCount = (v: PMVisit) => v.tasks.filter((t) => t.is_done).length;

  return (
    <AppLayout>
      <PageHeader
        title={WORK_MODULE.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => openCreate("pm")}>+ تعمیرات دوره‌ای</Btn>
            <Btn variant="ghost" onClick={() => openCreate("adhoc")}>+ عیب‌یابی موردی</Btn>
          </div>
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as WorkTypeFilter)}
          className="max-w-xs text-sm"
        >
          <option value="all">همه</option>
          <option value="pm">تعمیرات دوره‌ای</option>
          <option value="adhoc">عیب‌یابی موردی</option>
        </select>
        <input
          type="search"
          placeholder="فیلتر بر اساس نام، واحد، سرویس‌دهنده یا تجهیز..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={visits.length === 0 ? "کاری ثبت نشده" : "نتیجه‌ای یافت نشد"} />
      ) : (
        <>
          <div className="hide-mobile card table-wrap">
            <table className="w-full text-xs border-collapse leading-tight">
              <thead>
                <tr className="border-b-2 border-[#003b8e]/20 text-muted bg-[#f4f7fb]">
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">نوع</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">تاریخ دریافت</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">تاریخ تحویل</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">تجهیز</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">تحویل‌گیرنده</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">واحد</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">سرویس‌دهنده</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">تاریخ بازنگری</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">جزئیات</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">چک‌لیست</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    id={`visit-row-${v.id}`}
                    className={`border-b border-[#d5e3f2]/60 hover:bg-[#f4f7fb] text-center ${highlightId === String(v.id) ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""}`}
                  >
                    <td className="p-2 border border-[#d5e3f2]">
                      <Badge variant={v.work_type === "adhoc" ? "warning" : "success"}>{workTypeLabel(v.work_type)}</Badge>
                    </td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]"><JalaliDate value={v.visit_date} /></td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{v.return_date ? <JalaliDate value={v.return_date} /> : "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] font-medium text-[#003b8e] text-[11px]">{v.asset_id ? assetName(v.asset_id) : "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{v.recipient_name || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{unitLabel(v)}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{v.performed_by}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px] whitespace-nowrap">
                      {v.next_pm_date ? <JalaliDate value={v.next_pm_date} /> : "—"}
                    </td>
                    <td className="p-2 border border-[#d5e3f2] text-right align-top min-w-[210px] max-w-[320px]">
                      <div className="space-y-1 text-[11px] leading-4">
                        {v.title && <p><span className="font-bold">عنوان:</span> {v.title}</p>}
                        {v.notes && <p><span className="font-bold">یادداشت:</span> {v.notes}</p>}
                        {v.alert_description && <p><span className="font-bold">هشدار:</span> {v.alert_description}</p>}
                        {!v.title && !v.notes && !v.alert_description && <p className="text-muted">—</p>}
                      </div>
                    </td>
                    <td className="p-2 border border-[#d5e3f2]">
                      {v.work_type === "adhoc" ? (
                        <span className="text-[11px] text-muted">—</span>
                      ) : (
                        <Badge variant={doneCount(v) === v.tasks.length && v.tasks.length > 0 ? "success" : "warning"}>
                          {doneCount(v)}/{v.tasks.length}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 border border-[#d5e3f2]">
                      <div className="flex justify-center gap-1">
                        <Btn variant="ghost" onClick={() => openEdit(v)} className="text-[11px] px-2 py-0.5 min-h-0">ویرایش</Btn>
                        <Btn variant="danger" onClick={() => { if (confirm("حذف شود؟")) api.pmVisits.delete(v.id).then(load); }} className="text-[11px] px-2 py-0.5 min-h-0">حذف</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hide-desktop space-y-3">
            {filtered.map((v) => (
              <div
                key={v.id}
                id={`visit-row-${v.id}`}
                className={`card p-4 ${highlightId === String(v.id) ? "ring-2 ring-amber-300 bg-amber-50" : ""}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Badge variant={v.work_type === "adhoc" ? "warning" : "success"}>{workTypeLabel(v.work_type)}</Badge>
                    <p className="font-bold text-[#003b8e] mt-1">{v.asset_id ? assetName(v.asset_id) : v.title || unitLabel(v)}</p>
                    <p className="text-xs mt-1 flex flex-wrap gap-x-2 gap-y-1">
                      <JalaliDate value={v.visit_date} />
                      {v.return_date && <JalaliDate value={v.return_date} />}
                    </p>
                    <p className="text-xs text-muted mt-1">{v.recipient_name} · {unitLabel(v)} · {v.performed_by}</p>
                  </div>
                  {v.work_type !== "adhoc" && (
                    <Badge variant={doneCount(v) === v.tasks.length ? "success" : "warning"}>{doneCount(v)}/{v.tasks.length}</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => openEdit(v)} className="text-xs flex-1">ویرایش</Btn>
                  <Btn variant="danger" onClick={() => { if (confirm("حذف؟")) api.pmVisits.delete(v.id).then(load); }} className="text-xs flex-1">حذف</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "ویرایش کار" : "ثبت کار جدید"} wide>
        <FormField label="نوع کار">
          <select
            value={form.work_type || "pm"}
            onChange={(e) => onWorkTypeChange(e.target.value as "pm" | "adhoc")}
          >
            <option value="pm">تعمیرات دوره‌ای</option>
            <option value="adhoc">عیب‌یابی موردی</option>
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <FormField label="تاریخ دریافت (شمسی)">
            <JalaliDateTimeInput value={form.visit_date} onChange={(iso) => setForm({ ...form, visit_date: iso })} required />
          </FormField>
          <FormField label="تاریخ تحویل (شمسی)">
            <JalaliDateTimeInput value={form.return_date} onChange={(iso) => setForm({ ...form, return_date: iso })} />
          </FormField>
          {form.work_type === "adhoc" && (
            <div className="sm:col-span-2">
              <FormField label="عنوان کار">
                <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً رفع مشکل پرینتر" />
              </FormField>
            </div>
          )}
          <FormField label="تجهیز">
            <select value={form.asset_id || ""} onChange={(e) => onAssetChange(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">—</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
          <FormField label="واحد">
            <input
              value={form.recipient_unit || ""}
              onChange={(e) => setForm({ ...form, recipient_unit: e.target.value })}
              required={isPmForm}
            />
          </FormField>
          <FormField label="تحویل‌گیرنده">
            <input value={form.recipient_name || ""} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required={isPmForm} />
          </FormField>
          <FormField label="سرویس‌دهنده">
            <input value={form.performed_by || ""} onChange={(e) => setForm({ ...form, performed_by: e.target.value })} required />
          </FormField>
        </div>

        {isPmForm && (
          <FormField label="چک‌لیست">
            <div className="max-h-72 overflow-y-auto border-2 border-[#d5e3f2] rounded-xl bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#003b8e] text-white">
                    <th className="p-3 text-right border border-[#003b8e]/30 w-12">✓</th>
                    <th className="p-3 text-right border border-[#003b8e]/30">آیتم</th>
                    <th className="p-3 text-right border border-[#003b8e]/30 w-40">یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.tasks || []).map((task, idx) => (
                    <tr key={idx} className="hover:bg-[#f8fafc]">
                      <td className="p-2 border border-[#d5e3f2] text-center">
                        <button type="button" onClick={() => toggleTask(idx)} className="inline-flex">
                          {task.is_done ? <CheckSquare size={20} className="text-emerald-600" /> : <Square size={20} className="text-[#334d6e]" />}
                        </button>
                      </td>
                      <td className={`p-3 border border-[#d5e3f2] font-medium ${task.is_done ? "text-emerald-800 line-through" : "text-[#0f1b2d]"}`}>
                        {task.task_name}
                      </td>
                      <td className="p-2 border border-[#d5e3f2]">
                        <input
                          className="w-full text-xs"
                          value={task.notes || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              tasks: f.tasks?.map((t, i) => (i === idx ? { ...t, notes: e.target.value } : t)) || [],
                            }))
                          }
                          placeholder="اختیاری"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormField>
        )}

        <FormField label="یادداشت">
          <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>

        {isPmForm && (
          <div className="mt-4 p-4 rounded-2xl border-2 border-[#c8d9ee] bg-[#f8fafc]">
            <p className="font-black text-sm text-[#003b8e] mb-3">تنظیم هشدار تعمیرات</p>
            <p className="text-xs text-[#6b8299] mb-3">اگر عنوان و متن را خالی بگذارید، سیستم خودش از روی تجهیز و تاریخ پر می‌کند.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="تاریخ بازنگری (شمسی)">
                <JalaliDateTimeInput
                  withTime
                  value={form.next_pm_date}
                  onChange={(iso) => setForm({ ...form, next_pm_date: iso })}
                />
              </FormField>
              <FormField label="هشدار زرد (روز قبل) — ۰ = فقط همان ساعت">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.alert_warning_days ?? 30}
                  onChange={(e) => setForm({ ...form, alert_warning_days: Number(e.target.value) || 30 })}
                />
              </FormField>
              <FormField label="عنوان هشدار">
                <input
                  value={form.alert_title || ""}
                  onChange={(e) => setForm({ ...form, alert_title: e.target.value })}
                  placeholder="مثلاً موعد تعمیرات — واحد IT"
                />
              </FormField>
              <FormField label="متن هشدار">
                <textarea
                  rows={2}
                  value={form.alert_description || ""}
                  onChange={(e) => setForm({ ...form, alert_description: e.target.value })}
                  placeholder="توضیح دلخواه برای نوتیف ویندوز و لیست هشدارها"
                />
              </FormField>
            </div>
          </div>
        )}

        <AttachmentPanel entityType="pm_visit" entityId={editId} />

        <div className="flex gap-3 mt-4">
          <Btn onClick={save}>ذخیره</Btn>
          <Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn>
        </div>
      </Modal>
    </AppLayout>
  );
}
