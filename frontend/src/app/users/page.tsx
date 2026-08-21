"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn, Modal, FormField, EmptyState, Badge } from "@/components/ui";
import { api, UserProfile, PasswordResetRequestItem, getToken, forceRefreshSession } from "@/lib/api";
import { roleLabel, isAdmin, type UserRole } from "@/lib/roles";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [resets, setResets] = useState<PasswordResetRequestItem[]>([]);
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ username: "", full_name: "", role: "technician" as UserRole });
  const [form, setForm] = useState({ username: "", email: "", full_name: "", password: "", role: "technician" });
  const [resetCode, setResetCode] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.users.list().then(setUsers).catch(() => setUsers([]));
    api.passwordResetRequests.list("pending").then(setResets).catch(() => setResets([]));
  };

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.me().then((u) => {
      if (!isAdmin(u.role)) {
        router.replace("/dashboard");
        return;
      }
      setMe(u);
      load();
    }).catch(() => router.push("/login"));
  }, [router]);

  const create = async () => {
    setError("");
    try {
      await api.users.create(form);
      setModal(false);
      setForm({ username: "", email: "", full_name: "", password: "", role: "technician" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ساخت کاربر");
    }
  };

  const toggleActive = async (u: UserProfile) => {
    try {
      await api.users.update(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا");
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.users.update(editUser.id, {
        username: editForm.username,
        full_name: editForm.full_name,
        role: editForm.role,
      });
      if (editUser.id === me?.id) await forceRefreshSession();
      setEditUser(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا");
    }
  };

  const removeUser = async (u: UserProfile) => {
    if (u.id === me?.id) return;
    if (!confirm(`کاربر «${u.full_name}» حذف شود؟ این کار برگشت‌پذیر نیست.`)) return;
    try {
      await api.users.delete(u.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در حذف");
    }
  };

  const showResetCode = (res: { message: string; reset_code?: string }) => {
    if (res.reset_code) setResetCode(res.reset_code);
    alert(res.reset_code ? `${res.message}\n\nکد یک‌بارمصرف: ${res.reset_code}` : res.message);
  };

  const approveReset = async (id: number) => {
    const res = await api.passwordResetRequests.approve(id);
    showResetCode(res);
    load();
  };

  const approveUserReset = async (userId: number) => {
    const res = await api.approveUserPasswordReset(userId);
    showResetCode(res);
    load();
  };

  if (!me) return null;

  return (
    <AppLayout>
      <PageHeader title="مدیریت کاربران" action={<Btn onClick={() => { setError(""); setModal(true); }}>+ کاربر</Btn>} />

      {resetCode && (
        <div className="card p-4 mb-5 border-2 border-emerald-200 bg-emerald-50">
          <p className="font-black text-sm text-emerald-900 mb-1">کد یک‌بارمصرف ریست</p>
          <p className="font-mono text-2xl font-black tracking-widest text-[#003b8e]">{resetCode}</p>
          <p className="text-xs font-bold text-[#6b8299] mt-1">فقط همین یک بار نمایش داده می‌شود. آن را به کاربر بگویید.</p>
        </div>
      )}

      {resets.length > 0 && (
        <div className="card p-4 mb-5 border-2 border-amber-200 bg-amber-50">
          <p className="font-black text-sm text-amber-900 mb-3">درخواست فراموشی رمز</p>
          <div className="space-y-2">
            {resets.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl p-3 border border-amber-100">
                <div>
                  <p className="font-bold text-sm">{r.full_name}</p>
                  <p className="text-xs text-[#6b8299]">@{r.username} می‌خواهد رمز عوض کند</p>
                </div>
                <div className="flex gap-2">
                  <Btn className="text-xs" onClick={() => approveReset(r.id)}>تأیید ریست</Btn>
                  <Btn variant="ghost" className="text-xs" onClick={() => api.passwordResetRequests.reject(r.id).then(load)}>رد</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState message="کاربری نیست" />
      ) : (
        <div className="card table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d5e3f2] text-muted">
                <th className="p-4 text-right">نام</th>
                <th className="p-4 text-right">نام کاربری</th>
                <th className="p-4 text-right">نقش</th>
                <th className="p-4 text-right">وضعیت</th>
                <th className="p-4 text-right">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#d5e3f2]/60">
                  <td className="p-4 font-bold">{u.full_name}</td>
                  <td className="p-4">{u.username}</td>
                  <td className="p-4">{roleLabel(u.role)}</td>
                  <td className="p-4">
                    <Badge variant={u.is_active ? "success" : "critical"}>{u.is_active ? "فعال" : "غیرفعال"}</Badge>
                    {(u.must_change_password || u.allow_passwordless_login) && (
                      <span className="block text-[10px] font-bold text-amber-700 mt-1">منتظر تنظیم رمز جدید</span>
                    )}
                  </td>
                  <td className="p-4 flex flex-wrap gap-2">
                    <Btn
                      variant="ghost"
                      className="text-xs"
                      onClick={() => {
                        setEditUser(u);
                        setEditForm({ username: u.username, full_name: u.full_name, role: (u.role as UserRole) || "technician" });
                      }}
                    >
                      ویرایش
                    </Btn>
                    {u.id !== me.id && (
                      <>
                        <Btn variant="ghost" className="text-xs" onClick={() => toggleActive(u)}>
                          {u.is_active ? "غیرفعال" : "فعال"}
                        </Btn>
                        <Btn variant="danger" className="text-xs" onClick={() => removeUser(u)}>
                          حذف
                        </Btn>
                      </>
                    )}
                    <Btn variant="accent" className="text-xs" onClick={() => approveUserReset(u.id)}>
                      ریست رمز
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="کاربر جدید">
        <p className="text-xs font-bold text-[#6b8299] mb-3">تا حساب را نسازید، این فرد نمی‌تواند وارد شود.</p>
        <FormField label="نام کامل"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></FormField>
        <FormField label="نام کاربری"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></FormField>
        <FormField label="ایمیل"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
        <FormField label="رمز اولیه"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></FormField>
        <FormField label="نقش">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="technician">کارشناس</option>
            <option value="admin">مدیر</option>
          </select>
        </FormField>
        {error && <p className="text-red-700 text-sm font-bold mb-2">{error}</p>}
        <div className="flex gap-2 mt-4"><Btn onClick={create}>ذخیره</Btn><Btn variant="ghost" onClick={() => setModal(false)}>انصراف</Btn></div>
      </Modal>

      <Modal open={editUser !== null} onClose={() => setEditUser(null)} title="ویرایش کاربر">
        <FormField label="نام کامل"><input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></FormField>
        <FormField label="نام کاربری"><input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></FormField>
        <FormField label="نقش">
          <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}>
            <option value="technician">کارشناس</option>
            <option value="admin">مدیر</option>
          </select>
        </FormField>
        <div className="flex gap-2 mt-4"><Btn onClick={saveEdit}>ذخیره</Btn><Btn variant="ghost" onClick={() => setEditUser(null)}>انصراف</Btn></div>
      </Modal>
    </AppLayout>
  );
}
