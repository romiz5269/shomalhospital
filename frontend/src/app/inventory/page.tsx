"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Modal, FormField, EmptyState, Badge } from "@/components/ui";
import { api, InventoryItem, Asset, getToken } from "@/lib/api";
import { nowISO, todayIso } from "@/lib/dates";
import { JalaliDateTimeInput, JalaliDate } from "@/components/JalaliDateTimeInput";

const statusLabels: Record<string, string> = {
  received: "دریافت شده",
  pending_install: "در انتظار نصب",
  installed: "نصب شده",
  retired: "خارج از رده",
};

const empty: Partial<InventoryItem> = {
  name: "",
  category: "hardware",
  quantity: 1,
  received_date: nowISO(),
  status: "received",
};

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(empty);
  const [filter, setFilter] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const load = () => {
    api.inventory.list().then(setItems);
    api.assets.list().then(setAssets);
  };

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
    if (!highlightId || items.length === 0) return;
    document.getElementById(`inventory-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [items, highlightId]);

  const filtered = items.filter(
    (item) =>
      !filter ||
      item.name.includes(filter) ||
      item.purpose?.includes(filter) ||
      item.serial_number?.includes(filter) ||
      item.notes?.includes(filter)
  );

  const openCreate = () => { setEditId(null); setForm({ ...empty, received_date: todayIso() }); setModal(true); };
  const openEdit = (item: InventoryItem) => { setEditId(item.id); setForm(item); setModal(true); };

  const save = async () => {
    const payload = {
      ...form,
      received_date: form.received_date ? new Date(form.received_date).toISOString() : nowISO(),
      installed_date: form.installed_date ? new Date(form.installed_date).toISOString() : undefined,
    };
    if (editId) await api.inventory.update(editId, payload);
    else await api.inventory.create(payload);
    setModal(false);
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="کالای جدید"
        action={<Btn onClick={openCreate}>+ ثبت کالا</Btn>}
      />

      <div className="mb-4">
        <input
          type="search"
          placeholder="فیلتر بر اساس نام، کاربرد یا سریال..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={items.length === 0 ? "کالایی ثبت نشده — اولین مورد را اضافه کنید" : "نتیجه‌ای یافت نشد"} />
      ) : (
        <>
          <div className="hide-mobile card table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d5e3f2] text-muted">
                  <th className="p-4 text-right font-medium">نام</th>
                  <th className="p-4 text-right font-medium">کاربرد</th>
                  <th className="p-4 text-right font-medium">سریال</th>
                  <th className="p-4 text-right font-medium">تاریخ دریافت</th>
                  <th className="p-4 text-right font-medium">وضعیت</th>
                  <th className="p-4 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    id={`inventory-row-${item.id}`}
                    className={`border-b border-[#d5e3f2]/60 hover:bg-[#f4f7fb] ${highlightId === String(item.id) ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : ""}`}
                  >
                    <td className="p-4 font-medium text-[#003b8e]">{item.name}</td>
                    <td className="p-4 text-muted">{item.purpose || "—"}</td>
                    <td className="p-4 font-mono text-xs text-muted">{item.serial_number || "—"}</td>
                    <td className="p-4 text-muted"><JalaliDate value={item.received_date} /></td>
                    <td className="p-4"><Badge variant={item.status === "installed" ? "success" : "warning"}>{statusLabels[item.status] || item.status}</Badge></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Btn variant="ghost" onClick={() => openEdit(item)} className="text-xs px-3 py-1.5">ویرایش</Btn>
                        <Btn variant="danger" onClick={() => { if (confirm("حذف شود؟")) api.inventory.delete(item.id).then(load); }} className="text-xs px-3 py-1.5">حذف</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hide-desktop space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                id={`inventory-row-${item.id}`}
                className={`card p-4 ${highlightId === String(item.id) ? "ring-2 ring-amber-300 bg-amber-50" : ""}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[#003b8e]">{item.name}</h3>
                  <Badge variant={item.status === "installed" ? "success" : "warning"}>{statusLabels[item.status] || item.status}</Badge>
                </div>
                {item.purpose && <p className="text-xs text-muted mb-1">کاربرد: {item.purpose}</p>}
                <p className="text-xs text-muted mb-3">دریافت: <JalaliDate value={item.received_date} /></p>
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => openEdit(item)} className="text-xs flex-1">ویرایش</Btn>
                  <Btn variant="danger" onClick={() => { if (confirm("حذف؟")) api.inventory.delete(item.id).then(load); }} className="text-xs flex-1">حذف</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "ویرایش کالا" : "ثبت کالای جدید"}>
        <FormField label="نام کالا / تجهیز"><input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="مثلاً سرور HIS" /></FormField>
        <FormField label="کاربرد / هدف"><input value={form.purpose || ""} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="راه‌اندازی سرور HIS، جایگزینی PC پذیرش..." /></FormField>
        <FormField label="دسته">
          <select value={form.category || "hardware"} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="hardware">سخت‌افزار</option>
            <option value="server">سرور</option>
            <option value="network">شبکه</option>
            <option value="software">نرم‌افزار</option>
            <option value="consumable">مصرفی</option>
          </select>
        </FormField>
        <FormField label="سریال"><input value={form.serial_number || ""} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></FormField>
        <FormField label="تعداد"><input type="number" min={1} value={form.quantity || 1} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></FormField>
        <FormField label="تاریخ دریافت">
          <JalaliDateTimeInput value={form.received_date} onChange={(iso) => setForm({ ...form, received_date: iso })} />
        </FormField>
        <FormField label="تاریخ نصب">
          <JalaliDateTimeInput value={form.installed_date} onChange={(iso) => setForm({ ...form, installed_date: iso })} />
        </FormField>
        <FormField label="وضعیت">
          <select value={form.status || "received"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="تجهیز مرتبط (بعد از نصب)">
          <select value={form.asset_id || ""} onChange={(e) => setForm({ ...form, asset_id: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">—</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label="یادداشت"><textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
        <div className="flex gap-3 mt-4"><Btn onClick={save}>ذخیره</Btn><Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn></div>
      </Modal>
    </AppLayout>
  );
}
