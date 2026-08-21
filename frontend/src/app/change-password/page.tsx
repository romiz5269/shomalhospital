"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, FormField } from "@/components/ui";
import { api, setMustChangePassword, isTokenValid } from "@/lib/api";
import { useEffect } from "react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isTokenValid()) router.push("/login");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      setError("رمز جدید حداقل ۶ کاراکتر");
      return;
    }
    if (next !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.changePassword(current, next);
      setMustChangePassword(false);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="تغییر رمز عبور" />
      <form onSubmit={submit} className="card p-6 max-w-md space-y-4">
        <FormField label="رمز فعلی">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </FormField>
        <FormField label="رمز جدید">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
        </FormField>
        <FormField label="تکرار رمز جدید">
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </FormField>
        {error && <p className="text-red-600 text-sm font-bold">{error}</p>}
        <Btn type="submit" disabled={loading}>{loading ? "..." : "ذخیره رمز جدید"}</Btn>
      </form>
    </AppLayout>
  );
}
