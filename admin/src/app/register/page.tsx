"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
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
    <AuthLayout
      title="ثبت‌نام مدیر"
      subtitle="ایجاد حساب کاربری برای دسترسی به پنل مدیریت"
      footer={
        <>
          حساب دارید؟{" "}
          <Link href="/" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
            ورود
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">نام کامل</label>
          <div className="relative">
            <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field pr-11"
              placeholder="نام و نام خانوادگی"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">ایمیل</label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] pointer-events-none" />
            <input
              type="email"
              required
              dir="ltr"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field pr-11 text-left"
              placeholder="admin@hospital.ir"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">رمز عبور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] pointer-events-none" />
            <input
              type="password"
              required
              dir="ltr"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field pr-11 text-left"
              placeholder="حداقل ۸ کاراکتر + عدد"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">تکرار رمز عبور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)] pointer-events-none" />
            <input
              type="password"
              required
              dir="ltr"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="input-field pr-11 text-left"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
        </button>
      </form>
    </AuthLayout>
  );
}
