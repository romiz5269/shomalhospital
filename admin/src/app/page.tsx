"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { api, getToken, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.me().then(() => router.replace("/dashboard")).catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login(form);
      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-9 h-9 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout
      title="ورود به پنل"
      subtitle="برای مدیریت تیکت‌ها وارد حساب کاربری شوید"
      footer={
        <>
          حساب ندارید؟{" "}
          <Link href="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
            ثبت‌نام
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field pr-11 text-left"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-current rounded-full animate-spin" />
              در حال ورود...
            </>
          ) : (
            "ورود"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
