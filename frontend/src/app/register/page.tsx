"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Lock, Mail, Phone, User } from "lucide-react";
import { StaffAuthLayout } from "@/components/staff-auth-layout";
import { api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "", department: "", phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("رمز عبور و تکرار آن یکسان نیست");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.register({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
        phone: form.phone,
      });
      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت‌نام");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffAuthLayout
      title="ثبت‌نام کارکنان"
      subtitle="حساب کاربری برای ثبت و پیگیری تیکت‌های پشتیبانی"
      footer={
        <>
          حساب دارید؟{" "}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            ورود
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={User} label="نام کامل">
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field pr-11" placeholder="نام و نام خانوادگی" />
        </Field>
        <Field icon={Building2} label="بخش / واحد">
          <input type="text" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="input-field pr-11" placeholder="مثال: اورژانس" />
        </Field>
        <Field icon={Phone} label="شماره تماس">
          <input type="tel" required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-field pr-11 text-left" placeholder="09123456789" />
        </Field>
        <Field icon={Mail} label="ایمیل">
          <input type="email" required dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-field pr-11 text-left" placeholder="staff@hospital.ir" />
        </Field>
        <Field icon={Lock} label="رمز عبور">
          <input type="password" required dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-field pr-11 text-left" placeholder="حداقل ۸ کاراکتر + عدد" />
        </Field>
        <Field icon={Lock} label="تکرار رمز عبور">
          <input type="password" required dir="ltr" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="input-field pr-11 text-left" placeholder="••••••••" />
        </Field>
        {error && <div className="alert-error">{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary !bg-indigo-600 hover:!bg-indigo-700 dark:!text-white">
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
        </button>
      </form>
    </StaffAuthLayout>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
