"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  createDoctor,
  deleteDoctor,
  fetchAdminDoctors,
  updateDoctor,
  uploadCmsMedia,
  type DoctorOut,
} from "@/lib/cms-client";
import { DEPARTMENTS } from "@/lib/config";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Loader2, Pencil, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import clsx from "clsx";

type FormState = {
  name_fa: string;
  name_en: string;
  specialty_fa: string;
  specialty_en: string;
  department_code: string;
  image_url: string;
  bio_fa: string;
  rating: number;
  is_featured: boolean;
};

const emptyForm = (): FormState => ({
  name_fa: "",
  name_en: "",
  specialty_fa: "",
  specialty_en: "",
  department_code: "OPD",
  image_url: "",
  bio_fa: "",
  rating: 4.5,
  is_featured: false,
});

type Props = {
  dark?: boolean;
};

export default function DoctorsManager({ dark = false }: Props) {
  const [items, setItems] = useState<DoctorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminDoctors({
        q: q || undefined,
        department_code: dept || undefined,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بارگذاری پزشکان");
    } finally {
      setLoading(false);
    }
  }, [q, dept]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const res = await uploadCmsMedia(file);
      setForm((p) => ({ ...p, image_url: res.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "آپلود ناموفق");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (d: DoctorOut) => {
    setEditingId(d.id);
    setForm({
      name_fa: d.name_fa,
      name_en: d.name_en || "",
      specialty_fa: d.specialty_fa,
      specialty_en: d.specialty_en || "",
      department_code: d.department_code || "OPD",
      image_url: d.image_url || "",
      bio_fa: d.bio_fa || "",
      rating: d.rating ?? 4.5,
      is_featured: d.is_featured,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const onSave = async () => {
    if (!form.name_fa.trim() || !form.specialty_fa.trim()) {
      setError("نام و تخصص الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name_fa: form.name_fa.trim(),
        name_en: form.name_en.trim() || undefined,
        specialty_fa: form.specialty_fa.trim(),
        specialty_en: form.specialty_en.trim() || undefined,
        department_code: form.department_code,
        image_url: form.image_url || undefined,
        bio_fa: form.bio_fa.trim() || undefined,
        rating: Number(form.rating) || 4.5,
        is_featured: form.is_featured,
      };
      if (editingId) await updateDoctor(editingId, payload);
      else await createDoctor(payload);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق");
    } finally {
      setSaving(false);
    }
  };

  const shell = dark
    ? "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
    : "glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-6";
  const inputCls = dark
    ? "w-full rounded-xl border border-white/15 bg-[#0b1220] px-3 py-2.5 text-sm text-white"
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full max-w-full">
      <div className={clsx(shell, "space-y-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <label className={clsx("mb-1.5 block text-sm", dark ? "text-slate-300" : "")}>جستجو</label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="نام یا تخصص..."
                className={clsx(
                  "w-full rounded-xl border ps-9 pe-3 py-2.5 text-sm",
                  dark ? "border-white/15 bg-[#0b1220] text-white" : "border-shomal-border bg-white",
                )}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className={clsx("mb-1.5 block text-sm", dark ? "text-slate-300" : "")}>بخش</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className={clsx(
                "w-full rounded-xl border px-3 py-2.5 text-sm",
                dark ? "border-white/15 bg-[#0b1220] text-white" : "border-shomal-border bg-white",
              )}
            >
              <option value="">همه بخش‌ها</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.nameFa}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => void load()} className="shrink-0">
            اعمال فیلتر
          </Button>
        </div>
      </div>

      <div className={clsx(shell, "space-y-3")}>
        <h3 className={clsx("font-bold flex items-center gap-2", dark ? "text-white" : "text-shomal-primary")}>
          <Plus className="h-4 w-4" />
          {editingId ? "ویرایش پزشک" : "افزودن پزشک"}
        </h3>
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="نام (فارسی)" value={form.name_fa} onChange={(e) => setForm((p) => ({ ...p, name_fa: e.target.value }))} className={inputCls} />
          <Input label="نام (EN)" value={form.name_en} onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))} className={inputCls} />
          <Input label="تخصص" value={form.specialty_fa} onChange={(e) => setForm((p) => ({ ...p, specialty_fa: e.target.value }))} className={inputCls} />
          <div>
            <label className={clsx("mb-1.5 block text-sm", dark ? "text-slate-300" : "")}>بخش</label>
            <select
              value={form.department_code}
              onChange={(e) => setForm((p) => ({ ...p, department_code: e.target.value }))}
              className={clsx(
                "w-full rounded-xl border px-3 py-2.5 text-sm",
                dark ? "border-white/15 bg-[#0b1220] text-white" : "border-shomal-border bg-white",
              )}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.nameFa}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="امتیاز (۰ تا ۵)"
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={String(form.rating)}
            onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
            className={inputCls}
          />
          <label className={clsx("flex items-end gap-2 pb-2 text-sm", dark ? "text-slate-300" : "")}>
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
            />
            نمایش ویژه در صفحه اصلی
          </label>
        </div>
        <Input
          label="توضیحات"
          value={form.bio_fa}
          onChange={(e) => setForm((p) => ({ ...p, bio_fa: e.target.value }))}
          className={inputCls}
        />
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {form.image_url ? (
            <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-white/20 shrink-0">
              <Image src={form.image_url} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className={clsx("h-24 w-24 rounded-xl flex items-center justify-center text-xs", dark ? "bg-white/5 text-slate-400" : "bg-gray-100 text-gray-400")}>
              بدون تصویر
            </div>
          )}
          <label className={clsx("inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold", dark ? "border-white/15 text-white" : "border-shomal-border")}>
            <Upload className="h-4 w-4" />
            {uploading ? "در حال آپلود..." : "آپلود تصویر"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? "ذخیره تغییرات" : "افزودن"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              انصراف
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-[#5ba4d9]" />
          </div>
        ) : items.length === 0 ? (
          <p className={clsx("text-center py-8 text-sm", dark ? "text-slate-400" : "text-gray-500")}>پزشکی یافت نشد</p>
        ) : (
          items.map((d) => (
            <div key={d.id} className={clsx(shell, "flex flex-col sm:flex-row gap-4 sm:items-center")}>
              <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-black/20">
                {d.image_url ? (
                  <Image src={d.image_url} alt={d.name_fa} fill className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className={clsx("font-bold truncate", dark ? "text-white" : "")}>{d.name_fa}</p>
                <p className={clsx("text-sm truncate", dark ? "text-slate-400" : "text-gray-600")}>{d.specialty_fa}</p>
                <p className={clsx("text-xs mt-1 flex items-center gap-1", dark ? "text-amber-300" : "text-amber-700")}>
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {(d.rating ?? 4.5).toFixed(1)}
                  {d.is_featured ? " · ویژه" : ""}
                  {d.department_code ? ` · ${d.department_code}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(d)}>
                  <Pencil className="h-3.5 w-3.5" />
                  ویرایش
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("حذف پزشک؟")) return;
                    await deleteDoctor(d.id);
                    void load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
