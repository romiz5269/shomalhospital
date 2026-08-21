"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Modal, FormField, EmptyState } from "@/components/ui";
import { api, Asset, AssetUpgrade, getToken } from "@/lib/api";
import { AssetHardwareFields } from "@/components/AssetHardwareFields";
import { JalaliDateTimeInput, JalaliDate } from "@/components/JalaliDateTimeInput";
import { AttachmentPanel } from "@/components/AttachmentPanel";
import { operationalStatusLabel } from "@/lib/assetFields";

const empty: Partial<Asset> = { name: "", asset_type: "server", operational_status: "active" };

export default function ServersPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Asset[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Asset>>(empty);
  const [filter, setFilter] = useState("");
  const [upgrades, setUpgrades] = useState<AssetUpgrade[]>([]);
  const [upgradeForm, setUpgradeForm] = useState({ title: "", component: "", description: "" });

  const load = () => api.assets.list({ asset_type: "server" }).then(setServers);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!editId) {
      setUpgrades([]);
      return;
    }
    api.assets.listUpgrades(editId).then(setUpgrades).catch(() => setUpgrades([]));
  }, [editId]);

  const filtered = servers.filter(
    (s) =>
      !filter ||
      s.name.includes(filter) ||
      s.hostname?.includes(filter) ||
      s.ip_address?.includes(filter)
  );

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setModal(true);
  };

  const openEdit = (s: Asset) => {
    setEditId(s.id);
    setForm(s);
    setModal(true);
  };

  const save = async () => {
    if (editId) {
      await api.assets.update(editId, form);
      setModal(false);
    } else {
      const created = await api.assets.create({ ...form, asset_type: "server" });
      setEditId(created.id);
      setForm(created);
    }
    load();
  };

  const addUpgrade = async () => {
    if (!editId || !upgradeForm.title.trim()) return;
    await api.assets.createUpgrade(editId, upgradeForm);
    setUpgradeForm({ title: "", component: "", description: "" });
    setUpgrades(await api.assets.listUpgrades(editId));
  };

  return (
    <AppLayout>
      <PageHeader
        title="مدیریت سرورها"
        action={<Btn onClick={openCreate}>+ سرور جدید</Btn>}
      />

      <input
        type="search"
        placeholder="جستجو..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm text-sm mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState message="سروری ثبت نشده" />
      ) : (
        <div className="card table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d5e3f2] text-muted">
                <th className="p-4 text-right">Hostname</th>
                <th className="p-4 text-right">IP</th>
                <th className="p-4 text-right">OS</th>
                <th className="p-4 text-right">RAM</th>
                <th className="p-4 text-right">RAID</th>
                <th className="p-4 text-right">Rack</th>
                <th className="p-4 text-right">وضعیت</th>
                <th className="p-4 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-[#d5e3f2]/60 hover:bg-[#f4f7fb]">
                  <td className="p-4 font-medium text-[#003b8e]">{s.hostname || s.name}</td>
                  <td className="p-4 font-mono text-xs">{s.ip_address || "—"}</td>
                  <td className="p-4 text-xs">{s.os_name || "—"}</td>
                  <td className="p-4 text-xs">{s.ram || "—"}</td>
                  <td className="p-4 text-xs">{s.raid || "—"}</td>
                  <td className="p-4 text-xs">{s.rack || "—"}</td>
                  <td className="p-4 text-xs">{operationalStatusLabel(s.operational_status)}</td>
                  <td className="p-4">
                    <Btn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => openEdit(s)}>
                      ویرایش
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "ویرایش سرور" : "سرور جدید"}>
        <FormField label="نام / عنوان">
          <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </FormField>

        <AssetHardwareFields
          assetType="server"
          form={form}
          onChange={(patch) => setForm({ ...form, ...patch })}
          showWindows
          windowsActivatedAt={form.windows_activated_at}
          onWindowsActivatedChange={(iso) => setForm({ ...form, windows_activated_at: iso })}
          WindowsDateInput={JalaliDateTimeInput}
        />

        <FormField label="یادداشت">
          <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>

        {editId && (
          <>
            <AttachmentPanel entityType="asset" entityId={editId} />

            <div className="mt-4 p-4 rounded-2xl border-2 border-[#c8d9ee] bg-[#f8fafc]">
              <p className="font-black text-sm text-[#003b8e] mb-3">تاریخچه آپگرید</p>
              {upgrades.length === 0 ? (
                <p className="text-xs text-muted mb-3">هنوز آپگریدی ثبت نشده</p>
              ) : (
                <ul className="space-y-2 mb-4 text-sm">
                  {upgrades.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center gap-2 border-b border-[#eef3f9] pb-2">
                      <span className="font-bold">{u.title}</span>
                      {u.component && <span className="text-muted text-xs">({u.component})</span>}
                      <span className="text-xs text-muted">
                        <JalaliDate value={u.upgraded_at} /> — {u.upgraded_by}
                      </span>
                      <Btn
                        variant="danger"
                        className="text-xs px-2 py-1 mr-auto"
                        onClick={async () => {
                          if (!confirm("حذف شود؟")) return;
                          await api.assets.deleteUpgrade(editId, u.id);
                          setUpgrades(await api.assets.listUpgrades(editId));
                        }}
                      >
                        حذف
                      </Btn>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="عنوان آپگرید">
                  <input
                    value={upgradeForm.title}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, title: e.target.value })}
                    placeholder="مثلاً ارتقای RAM"
                  />
                </FormField>
                <FormField label="قطعه">
                  <input
                    value={upgradeForm.component}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, component: e.target.value })}
                    placeholder="RAM، SSD، CPU..."
                  />
                </FormField>
              </div>
              <FormField label="توضیح">
                <textarea
                  rows={2}
                  value={upgradeForm.description}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, description: e.target.value })}
                />
              </FormField>
              <Btn variant="ghost" className="mt-2" onClick={addUpgrade}>
                ثبت آپگرید
              </Btn>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-4">
          <Btn onClick={save}>ذخیره</Btn>
          <Btn variant="ghost" onClick={() => setModal(false)}>
            انصراف
          </Btn>
        </div>
      </Modal>
    </AppLayout>
  );
}
