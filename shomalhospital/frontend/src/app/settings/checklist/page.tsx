"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Panel, FormField, EmptyState } from "@/components/ui";
import { api, PMChecklistTemplate, getToken } from "@/lib/api";
import { Plus, Trash2, Settings } from "lucide-react";

type Category = { id: string; label: string };

const DEFAULT_CATEGORIES: Category[] = [
  { id: "pc", label: "PC" },
  { id: "server", label: "سرور" },
  { id: "printer", label: "پرینتر" },
  { id: "his", label: "HIS" },
  { id: "general", label: "عمومی" },
];

export default function ChecklistSettingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PMChecklistTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [filter, setFilter] = useState("all");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("pc");
  const [saving, setSaving] = useState(false);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [catDraft, setCatDraft] = useState<Category[]>([]);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const load = () => api.pmVisits.templates(undefined, true).then(setItems);
  const loadCategories = () =>
    api.assetCategories.list().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !cats.find((c) => c.id === category)) {
        setCategory(cats[0].id);
      }
    }).catch(() => {});

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load();
    loadCategories();
    try {
      const t = getToken();
      if (t) {
        const payload = JSON.parse(atob(t.split(".")[1]));
        setIsAdmin(payload.role === "admin");
      }
    } catch {}
  }, [router]);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  const addItem = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.pmVisits.createTemplate({ name: name.trim(), category });
      setName("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: number) => {
    if (!confirm("این مورد از چک‌لیست حذف شود؟")) return;
    await api.pmVisits.deleteTemplate(id);
    load();
  };

  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label || id;

  const openCatEditor = () => {
    setCatDraft([...categories]);
    setNewCatId("");
    setNewCatLabel("");
    setShowCatEditor(true);
  };

  const addCatDraft = () => {
    const id = newCatId.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newCatLabel.trim();
    if (!id || !label) return;
    if (catDraft.find((c) => c.id === id)) return;
    setCatDraft([...catDraft, { id, label }]);
    setNewCatId("");
    setNewCatLabel("");
  };

  const removeCatDraft = (id: string) => setCatDraft(catDraft.filter((c) => c.id !== id));

  const saveCats = async () => {
    if (catDraft.length === 0) return;
    const saved = await api.assetCategories.update(catDraft);
    setCategories(saved);
    setShowCatEditor(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="چک‌لیست تعمیرات"
      />

      <Panel className="mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <FormField label="نام آیتم چک‌لیست" className="!mb-0 flex-1 min-w-0">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="بررسی آنتی‌ویروس" />
          </FormField>
          <FormField label="دسته" className="!mb-0 w-full sm:w-40 shrink-0">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </FormField>
          <Btn onClick={addItem} disabled={saving || !name.trim()} className="w-full sm:w-auto shrink-0 h-[3.15rem] px-6">
            <Plus size={16} className="ml-1" /> افزودن
          </Btn>
        </div>
      </Panel>

      <div className="mb-4 flex items-center gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs text-sm">
          <option value="all">همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {isAdmin && (
          <Btn variant="ghost" onClick={openCatEditor} className="text-xs">
            <Settings size={14} className="ml-1" /> مدیریت دسته‌ها
          </Btn>
        )}
      </div>

      {showCatEditor && (
        <Panel className="mb-6">
          <p className="text-sm font-bold text-[#003b8e] mb-3">مدیریت دسته‌ها</p>
          <div className="space-y-2 mb-4">
            {catDraft.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs bg-[#e8f0fa] px-2 py-1 rounded font-mono">{c.id}</span>
                <span className="text-sm font-medium flex-1">{c.label}</span>
                <button onClick={() => removeCatDraft(c.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end mb-3">
            <FormField label="شناسه (انگلیسی)" className="!mb-0 flex-1">
              <input value={newCatId} onChange={(e) => setNewCatId(e.target.value)} placeholder="مثلاً ups" className="text-sm" />
            </FormField>
            <FormField label="نام نمایشی" className="!mb-0 flex-1">
              <input value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} placeholder="مثلاً UPS" className="text-sm" />
            </FormField>
            <Btn onClick={addCatDraft} disabled={!newCatId.trim() || !newCatLabel.trim()} className="h-[2.5rem]">+</Btn>
          </div>
          <div className="flex gap-2">
            <Btn onClick={saveCats}>ذخیره دسته‌ها</Btn>
            <Btn variant="ghost" onClick={() => setShowCatEditor(false)}>انصراف</Btn>
          </div>
        </Panel>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="موردی در چک‌لیست نیست" />
      ) : (
        <div className="card table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d5e3f2] text-muted">
                <th className="p-4 text-right">نام</th>
                <th className="p-4 text-right">دسته</th>
                <th className="p-4 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-[#d5e3f2]/60">
                  <td className="p-4 font-bold">{item.name}</td>
                  <td className="p-4">{catLabel(item.category)}</td>
                  <td className="p-4">
                    <Btn variant="danger" className="text-xs" onClick={() => removeItem(item.id)}>
                      <Trash2 size={14} className="ml-1" /> حذف
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
