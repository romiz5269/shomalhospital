"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Modal, FormField, StatusLight, EmptyState } from "@/components/ui";
import { api, Asset, AssetHardware, AssetImage, AssetSoftware, getToken } from "@/lib/api";
import { JalaliDateTimeInput, JalaliDate } from "@/components/JalaliDateTimeInput";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { operationalStatusLabel } from "@/lib/assetFields";
import { todayIso } from "@/lib/dates";

const empty: Partial<Asset> & { hardware?: Partial<AssetHardware>; software?: Partial<AssetSoftware> } = {
  name: "", asset_type: "pc", operational_status: "active",
  hardware: {}, software: {},
};

const typeLabels: Record<string, string> = {
  pc: "PC", server: "سرور", printer: "پرینتر", network: "شبکه", other: "سایر",
};
const imageBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api").replace(/\/api$/, "");

type FormTab = "general" | "hardware" | "software" | "extra";

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [hw, setHw] = useState<Partial<AssetHardware>>({});
  const [sw, setSw] = useState<Partial<AssetSoftware>>({});
  const [tab, setTab] = useState<FormTab>("general");
  const [filter, setFilter] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [reminderForm, setReminderForm] = useState({ title: "", description: "", due_date: todayIso(), warning_days: 30 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = () => api.assets.list().then(setAssets);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load();
  }, [router]);

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
    if (!highlightId || assets.length === 0) return;
    document.getElementById(`asset-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [assets, highlightId]);

  const filtered = assets.filter(
    (a) =>
      !filter ||
      a.name?.toLowerCase().includes(filter.toLowerCase()) ||
      a.serial_number?.includes(filter) ||
      a.ip_address?.includes(filter) ||
      a.assigned_to?.includes(filter) ||
      a.asset_code?.includes(filter) ||
      a.section_name?.includes(filter)
  );

  const openCreate = () => { setEditId(null); setForm(empty); setHw({}); setSw({}); setTab("general"); setModal(true); };
  const openEdit = (a: Asset) => {
    setEditId(a.id);
    setForm(a);
    setHw(a.hardware || {});
    setSw(a.software || {});
    setTab("general");
    setModal(true);
  };

  const save = async () => {
    const payload = { ...form, hardware: hw, software: sw };
    if (editId) {
      await api.assets.update(editId, payload);
      setModal(false);
    } else {
      const created = await api.assets.create(payload);
      setEditId(created.id);
      setForm(created);
      setHw(created.hardware || {});
      setSw(created.software || {});
    }
    load();
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await api.assets.importPreview(file);
    setImportPreview(data.preview);
    setImportErrors(data.errors);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!importPreview?.length) return;
    const r = await api.assets.importConfirm(importPreview);
    alert(`${r.created} تجهیز import شد`);
    setImportPreview(null);
    load();
  };

  const tabs: { key: FormTab; label: string }[] = [
    { key: "general", label: "عمومی" },
    { key: "hardware", label: "سخت‌افزار" },
    { key: "software", label: "نرم‌افزار" },
    { key: "extra", label: "گارانتی و پیوست" },
  ];

  return (
    <AppLayout>
      <PageHeader title="تجهیزات" action={<Btn onClick={openCreate}>+ افزودن</Btn>} />

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <input type="search" placeholder="فیلتر..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm text-sm" />
        <label className="text-xs font-bold text-[#003b8e] cursor-pointer border border-[#c8d9ee] px-3 py-2 rounded-xl bg-white">
          Import Excel
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportFile} />
        </label>
      </div>

      {importPreview && (
        <div className="card p-4 mb-4">
          <p className="font-black text-[#003b8e] mb-2">پیش‌نمایش import ({importPreview.length} ردیف)</p>
          {importErrors.length > 0 && <p className="text-xs text-red-600 mb-2">{importErrors.join(" · ")}</p>}
          <div className="max-h-40 overflow-auto text-xs mb-3">
            {importPreview.slice(0, 5).map((r, i) => (
              <div key={i}>{r.name} — {r.hw_cpu || r.asset_type || ""} — {r.section_name || ""}</div>
            ))}
          </div>
          <div className="flex gap-2"><Btn onClick={confirmImport}>تأیید import</Btn><Btn variant="ghost" onClick={() => setImportPreview(null)}>انصراف</Btn></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="تجهیزی ثبت نشده — اولین تجهیز را اضافه کنید" />
      ) : (
        <>
          <div className="hide-mobile card table-wrap">
            <table className="w-full text-xs border-collapse leading-tight">
              <thead>
                <tr className="border-b-2 border-[#003b8e]/20 text-muted bg-[#f4f7fb]">
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">ROW</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">SYSTEM NAME</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">CPU</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">RAM</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">IP</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">MAC</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">Asset Code</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">USER NAME</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">بخش</th>
                  <th className="p-2 text-center font-medium border border-[#d5e3f2]">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <tr
                    key={a.id}
                    id={`asset-row-${a.id}`}
                    className={`border-b border-[#d5e3f2]/60 hover:bg-[#f4f7fb] text-center ${highlightId === String(a.id) ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""}`}
                  >
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{idx + 1}</td>
                    <td className="p-2 border border-[#d5e3f2] font-medium text-[#003b8e] text-[11px]">{a.name}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px] font-mono">{a.hardware?.cpu || a.cpu || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px] font-mono">{a.hardware?.ram || a.ram || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px] font-mono">{a.ip_address || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px] font-mono">{a.mac_address || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{a.asset_code || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{a.assigned_to || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2] text-[11px]">{a.section_name || "—"}</td>
                    <td className="p-2 border border-[#d5e3f2]">
                      <div className="flex justify-center gap-1">
                        <Btn variant="ghost" onClick={() => openEdit(a)} className="text-[11px] px-2 py-0.5 min-h-0">ویرایش</Btn>
                        <Btn variant="danger" onClick={() => { if (confirm("حذف شود؟")) api.assets.delete(a.id).then(load); }} className="text-[11px] px-2 py-0.5 min-h-0">حذف</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hide-desktop space-y-3">
            {filtered.map((a) => (
              <div key={a.id} id={`asset-row-${a.id}`} className={`card p-4 ${highlightId === String(a.id) ? "ring-2 ring-amber-300 bg-amber-50" : ""}`}>
                <h3 className="font-bold text-[#003b8e] mb-1">{a.name}</h3>
                <div className="text-xs text-muted space-y-1 mb-3">
                  {a.hardware?.cpu && <p>CPU: {a.hardware.cpu}</p>}
                  {a.ip_address && <p>IP: {a.ip_address}</p>}
                  {a.assigned_to && <p>کاربر: {a.assigned_to}</p>}
                  {a.section_name && <p>بخش: {a.section_name}</p>}
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => openEdit(a)} className="text-xs flex-1">ویرایش</Btn>
                  <Btn variant="danger" onClick={() => { if (confirm("حذف؟")) api.assets.delete(a.id).then(load); }} className="text-xs flex-1">حذف</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "ویرایش تجهیز" : "تجهیز جدید"} wide>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-[#d5e3f2] pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-t-xl font-bold transition-colors ${tab === t.key ? "bg-[#003b8e] text-white" : "text-[#6b8299] hover:bg-[#f4f7fb]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: General */}
        {tab === "general" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="SYSTEM NAME (نام سیستم)">
              <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="SYSTEM NAME-OLD">
              <input value={form.system_name_old || ""} onChange={(e) => setForm({ ...form, system_name_old: e.target.value })} />
            </FormField>
            <FormField label="نوع دستگاه">
              <select value={form.asset_type || "pc"} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="Asset Code">
              <input value={form.asset_code || ""} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} />
            </FormField>
            <FormField label="IP">
              <input value={form.ip_address || ""} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="MAC">
              <input value={form.mac_address || ""} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="USER NAME ID">
              <input value={form.user_name_id || ""} onChange={(e) => setForm({ ...form, user_name_id: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="USER NAME - Used (مسئول)">
              <input value={form.assigned_to || ""} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </FormField>
            <FormField label="بخش - Section">
              <input value={form.section_name || ""} onChange={(e) => setForm({ ...form, section_name: e.target.value })} />
            </FormField>
            <FormField label="Section ID">
              <input value={form.section_id || ""} onChange={(e) => setForm({ ...form, section_id: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="طبقه">
              <input value={form.floor || ""} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </FormField>
            <FormField label="PM Date">
              <input value={form.pm_date || ""} onChange={(e) => setForm({ ...form, pm_date: e.target.value })} />
            </FormField>
            <FormField label="وضعیت عملیاتی">
              <select value={form.operational_status || "active"} onChange={(e) => setForm({ ...form, operational_status: e.target.value })}>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="repair">تعمیر</option>
                <option value="retired">بازنشسته</option>
              </select>
            </FormField>
          </div>
        )}

        {/* Tab: Hardware */}
        {tab === "hardware" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="MB (مادربرد)">
              <input value={hw.mb || ""} onChange={(e) => setHw({ ...hw, mb: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="CPU">
              <input value={hw.cpu || ""} onChange={(e) => setHw({ ...hw, cpu: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="RAM">
              <input value={hw.ram || ""} onChange={(e) => setHw({ ...hw, ram: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="VGA">
              <input value={hw.vga || ""} onChange={(e) => setHw({ ...hw, vga: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="POWER">
              <input value={hw.power || ""} onChange={(e) => setHw({ ...hw, power: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="HARD (هارد)">
              <input value={hw.hard || ""} onChange={(e) => setHw({ ...hw, hard: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="Monitor / Asset Code">
              <input value={hw.monitor_asset_code || ""} onChange={(e) => setHw({ ...hw, monitor_asset_code: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="Monitor Name">
              <input value={hw.monitor_name || ""} onChange={(e) => setHw({ ...hw, monitor_name: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="PRINTER Name">
              <input value={hw.printer_name || ""} onChange={(e) => setHw({ ...hw, printer_name: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="PRINTER / Asset Code">
              <input value={hw.printer_asset_code || ""} onChange={(e) => setHw({ ...hw, printer_asset_code: e.target.value })} dir="ltr" />
            </FormField>
          </div>
        )}

        {/* Tab: Software */}
        {tab === "software" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="OS (سیستم‌عامل)">
              <input value={sw.os_name || ""} onChange={(e) => setSw({ ...sw, os_name: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="AntiVirus">
              <input value={sw.antivirus || ""} onChange={(e) => setSw({ ...sw, antivirus: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="AntiVirus Status">
              <select value={sw.antivirus_status || ""} onChange={(e) => setSw({ ...sw, antivirus_status: e.target.value })}>
                <option value="">—</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </FormField>
            <FormField label="MailUser">
              <input value={sw.mail_user || ""} onChange={(e) => setSw({ ...sw, mail_user: e.target.value })} dir="ltr" />
            </FormField>
            <FormField label="Windows Key">
              <input value={sw.windows_key || ""} onChange={(e) => setSw({ ...sw, windows_key: e.target.value })} dir="ltr" />
            </FormField>
          </div>
        )}

        {/* Tab: Extra */}
        {tab === "extra" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#c8d9ee] mb-4">
              <p className="sm:col-span-2 font-black text-sm text-[#003b8e]">گارانتی و تأمین‌کننده</p>
              <FormField label="تاریخ خرید"><JalaliDateTimeInput value={form.purchase_date} onChange={(iso) => setForm({ ...form, purchase_date: iso })} /></FormField>
              <FormField label="پایان گارانتی"><JalaliDateTimeInput value={form.warranty_end_date} onChange={(iso) => setForm({ ...form, warranty_end_date: iso })} /></FormField>
              <FormField label="برند"><input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></FormField>
              <FormField label="مدل"><input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></FormField>
              <FormField label="تأمین‌کننده"><input value={form.vendor_name || ""} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></FormField>
              <FormField label="تلفن تأمین‌کننده"><input value={form.vendor_phone || ""} onChange={(e) => setForm({ ...form, vendor_phone: e.target.value })} /></FormField>
            </div>
            <FormField label="یادداشت"><textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>

            {editId && (
              <div className="mt-4 p-4 rounded-2xl border border-[#c8d9ee] bg-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-black text-sm text-[#003b8e]">عکس تجهیزات (photes)</p>
                  <label className="text-xs font-bold text-[#003b8e] cursor-pointer border border-[#c8d9ee] px-3 py-2 rounded-xl bg-[#f8fafc]">
                    {uploadingPhoto ? "در حال آپلود..." : "افزودن عکس"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !editId) return;
                        setUploadingPhoto(true);
                        try {
                          const img = await api.assets.uploadImage(editId, file);
                          setForm((prev) => ({ ...prev, images: ([...(prev.images || []), img] as AssetImage[]) }));
                        } finally {
                          setUploadingPhoto(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
                {(form.images?.length || 0) === 0 ? (
                  <p className="text-xs text-[#6b8299]">هنوز عکسی ثبت نشده است.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(form.images || []).map((img) => (
                      <div key={img.id} className="border border-[#d5e3f2] rounded-xl p-2 bg-[#f8fafc]">
                        <img
                          src={`${imageBaseUrl}/uploads/asset_images/${img.stored_name}`}
                          alt={img.original_name}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                        <p className="text-[11px] truncate mb-2">{img.original_name}</p>
                        <Btn
                          variant="danger"
                          className="text-[11px] px-2 py-1 w-full"
                          onClick={async () => {
                            if (!editId) return;
                            await api.assets.deleteImage(editId, img.id);
                            setForm((prev) => ({ ...prev, images: (prev.images || []).filter((x) => x.id !== img.id) }));
                          }}
                        >
                          حذف عکس
                        </Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <AttachmentPanel entityType="asset" entityId={editId} />
            {editId && (
              <div className="mt-4 p-4 rounded-2xl border-2 border-[#c8d9ee] bg-[#f8fafc]">
                <p className="font-black text-sm text-[#003b8e] mb-3">افزودن هشدار دستی</p>
                <FormField label="عنوان">
                  <input value={reminderForm.title} onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })} placeholder={`مثلاً تمدید لایسنس — ${form.name}`} />
                </FormField>
                <FormField label="موعد (شمسی)">
                  <JalaliDateTimeInput value={reminderForm.due_date} onChange={(iso) => setReminderForm({ ...reminderForm, due_date: iso || reminderForm.due_date })} />
                </FormField>
                <Btn
                  variant="ghost"
                  className="mt-2"
                  onClick={async () => {
                    if (!reminderForm.title.trim() || !editId) return;
                    await api.reminders.create({
                      title: reminderForm.title,
                      description: reminderForm.description || undefined,
                      asset_id: editId,
                      reminder_type: "custom",
                      due_date: new Date(reminderForm.due_date).toISOString(),
                      warning_days: reminderForm.warning_days,
                      source: "manual",
                    });
                    setReminderForm({ title: "", description: "", due_date: todayIso(), warning_days: 30 });
                    alert("هشدار ثبت شد");
                  }}
                >
                  ثبت هشدار
                </Btn>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 mt-4"><Btn onClick={save}>ذخیره</Btn><Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn></div>
      </Modal>
    </AppLayout>
  );
}
