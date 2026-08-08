"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  listAdminInsurances,
  patchInsurance,
  softDeleteInsurance,
  upsertInsurance,
  type InsuranceAdmin,
} from "@/lib/insurance-admin-client";
import { uploadCmsMedia } from "@/lib/cms-client";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import clsx from "clsx";

const empty = () => ({
  code: "",
  name_fa: "",
  name_en: "",
  logo_url: "",
  website_url: "",
  sort_order: 10,
  is_active: true,
  is_featured: true,
});

/** Suggest logo from company website domain (Clearbit) — admin can override/upload. */
function logoFromWebsite(website: string): string {
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    const host = u.hostname.replace(/^www\./, "");
    if (!host) return "";
    return `https://logo.clearbit.com/${host}`;
  } catch {
    return "";
  }
}

export default function InsurancesManager() {
  const [items, setItems] = useState<InsuranceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await listAdminInsurances());
    } catch (e) {
      setError(
        e instanceof Error && e.message === "INSURANCE_NETWORK_ERROR"
          ? "سرویس بیمه (5004) در دسترس نیست."
          : e instanceof Error
            ? e.message
            : "خطا",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    if (!form.code.trim() || !form.name_fa.trim()) {
      setError("کد و نام فارسی لازم است.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await patchInsurance(editId, {
          name_fa: form.name_fa,
          name_en: form.name_en || undefined,
          logo_url: form.logo_url || undefined,
          website_url: form.website_url || undefined,
          sort_order: form.sort_order,
          is_active: form.is_active,
          is_featured: form.is_featured,
        });
      } else {
        await upsertInsurance({
          code: form.code.trim().toLowerCase(),
          name_fa: form.name_fa,
          name_en: form.name_en || undefined,
          logo_url: form.logo_url || undefined,
          website_url: form.website_url || undefined,
          sort_order: form.sort_order,
          is_active: form.is_active,
          is_featured: form.is_featured,
        });
      }
      setForm(empty());
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق");
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file: File) => {
    setSaving(true);
    try {
      const res = await uploadCmsMedia(file);
      setForm((f) => ({ ...f, logo_url: res.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "آپلود لوگو ناموفق");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="glass-premium rounded-2xl p-4 sm:p-6 space-y-3 max-w-3xl">
        <h3 className="font-bold text-shomal-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {editId ? "ویرایش بیمه" : "افزودن بیمه"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="کد (لاتین)"
            value={form.code}
            dir="ltr"
            disabled={!!editId}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            label="ترتیب"
            type="number"
            value={String(form.sort_order)}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
          />
          <Input
            label="نام فارسی"
            value={form.name_fa}
            onChange={(e) => setForm({ ...form, name_fa: e.target.value })}
          />
          <Input
            label="نام انگلیسی"
            value={form.name_en}
            onChange={(e) => setForm({ ...form, name_en: e.target.value })}
          />
        </div>
        <Input
          label="سایت رسمی بیمه"
          value={form.website_url}
          dir="ltr"
          placeholder="https://www.tamin.ir"
          onChange={(e) => setForm({ ...form, website_url: e.target.value })}
        />
        <Input
          label="آدرس لوگو (URL یا آپلود)"
          value={form.logo_url}
          dir="ltr"
          placeholder="/insurance-logos/tamin.svg یا https://..."
          onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="rounded-xl border border-shomal-border px-3 py-2 font-semibold text-shomal-primary hover:bg-shomal-primary/5"
            onClick={() => {
              const suggested = logoFromWebsite(form.website_url);
              if (!suggested) {
                setError("اول آدرس سایت رسمی بیمه را وارد کنید.");
                return;
              }
              setForm((f) => ({ ...f, logo_url: suggested }));
              setError("");
            }}
          >
            گرفتن لوگو از سایت رسمی
          </button>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4 text-shomal-primary" />
            <span>آپلود لوگو</span>
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUploadLogo(f);
                e.target.value = "";
              }}
            />
          </label>
          {form.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain border border-shomal-border bg-white" />
          )}
        </div>
        <p className="text-[11px] text-muted leading-5">
          لوگو را آپلود کنید، URL بگذارید، یا از سایت رسمی پیشنهاد بگیرید (Clearbit). اگر لوگو نیامد، فایل محلی یا آپلود دستی بگذارید.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            فعال
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            نمایش در صفحه اصلی
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "..." : "ذخیره"}
          </Button>
          {editId && (
            <Button
              type="button"
              variant="outline"
              className="!text-shomal-primary !border-shomal-border"
              onClick={() => {
                setEditId(null);
                setForm(empty());
              }}
            >
              انصراف
            </Button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={clsx(
              "rounded-2xl border border-shomal-border bg-surface p-4 flex gap-3",
              !item.is_active && "opacity-50",
            )}
          >
            <div className="h-14 w-14 rounded-xl bg-[#003b8e]/8 flex items-center justify-center overflow-hidden shrink-0">
              {item.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logo_url} alt="" className="max-h-12 max-w-12 object-contain" />
              ) : (
                <span className="font-bold text-shomal-primary">{item.name_fa.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate">{item.name_fa}</p>
              <p className="text-[11px] text-muted" dir="ltr">
                {item.code} · #{item.sort_order}
                {item.is_featured ? " · featured" : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="rounded-lg bg-[#003b8e]/10 px-2 py-1 text-[11px] font-semibold text-[#003b8e]"
                  onClick={() => {
                    setEditId(item.id);
                    setForm({
                      code: item.code,
                      name_fa: item.name_fa,
                      name_en: item.name_en || "",
                      logo_url: item.logo_url || "",
                      website_url: item.website_url || "",
                      sort_order: item.sort_order,
                      is_active: item.is_active,
                      is_featured: item.is_featured,
                    });
                  }}
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-shomal-border px-2 py-1 text-[11px]"
                  onClick={async () => {
                    await patchInsurance(item.id, { is_active: !item.is_active });
                    void load();
                  }}
                >
                  {item.is_active ? "غیرفعال" : "فعال"}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700"
                  onClick={async () => {
                    if (!confirm("حذف نرم؟")) return;
                    await softDeleteInsurance(item.id);
                    void load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
