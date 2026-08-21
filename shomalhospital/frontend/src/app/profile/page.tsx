"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn } from "@/components/ui";
import { api, getToken, clearToken, UserProfile } from "@/lib/api";
import { ROLE_LABELS, isAdmin } from "@/lib/roles";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.me().then((u) => {
      setUser(u);
      setFullName(u.full_name);
      setUsername(u.username);
    }).catch(() => router.push("/login"));
  }, [router]);

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: { full_name?: string; username?: string } = { full_name: fullName };
      if (isAdmin(user.role) && username.trim() && username.trim() !== user.username) {
        payload.username = username.trim();
      }
      const updated = await api.updateProfile(payload);
      setUser(updated);
      setUsername(updated.username);
      setFullName(updated.full_name);
      setMessage("ذخیره شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center text-muted py-20">در حال بارگذاری...</div>
      </AppLayout>
    );
  }

  const admin = isAdmin(user.role);

  return (
    <AppLayout>
      <PageHeader title="پروفایل" />

      <div className="card p-6 max-w-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-shomal flex items-center justify-center text-white text-2xl font-bold">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-lg text-[#003b8e]">{user.full_name}</p>
            <p className="text-sm text-muted">@{user.username}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-xl bg-[#f4f7fb]">
            <label className="text-muted block mb-2">نام کامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="p-3 rounded-xl bg-[#f4f7fb]">
            <label className="text-muted block mb-2">نام کاربری</label>
            {admin ? (
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            ) : (
              <p className="font-bold">@{user.username}</p>
            )}
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-[#f4f7fb]">
            <span className="text-muted">نقش</span>
            <span className="font-bold">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}</span>
          </div>
        </div>

        {error && <p className="text-red-700 text-sm font-bold mt-3">{error}</p>}
        {message && <p className="text-emerald-700 text-sm font-bold mt-3">{message}</p>}

        <Btn onClick={save} disabled={saving} className="w-full mt-4">
          {saving ? "..." : "ذخیره تغییرات"}
        </Btn>

        <Link href="/change-password" className="block text-center text-sm font-bold text-[#003b8e] hover:underline mt-4">
          تغییر رمز عبور
        </Link>

        <Btn variant="danger" onClick={logout} className="w-full mt-4">خروج از حساب</Btn>
      </div>
    </AppLayout>
  );
}
