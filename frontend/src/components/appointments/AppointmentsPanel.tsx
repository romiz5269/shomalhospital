"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { DEPARTMENTS } from "@/lib/config";
import {
  bookAppointment,
  cancelAppointment,
  fetchMyAppointments,
} from "@/lib/appointments-client";
import {
  doctorDisplayName,
  doctorDisplaySpecialty,
  fetchPublicDoctors,
  type DoctorOut,
} from "@/lib/cms-client";
import type { AppointmentOut } from "@/lib/types";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  Stethoscope,
  XCircle,
} from "lucide-react";
import clsx from "clsx";

type Step = "dept" | "doctor" | "schedule" | "done";

export default function AppointmentsPanel() {
  const t = useTranslations("appointments");
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<AppointmentOut[]>([]);
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<Step>("dept");
  const [statusFilter, setStatusFilter] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [deptCode, setDeptCode] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [ignoreDeptFilter, setIgnoreDeptFilter] = useState(false);

  const TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
  ];

  useEffect(() => {
    const dept = searchParams.get("dept");
    if (dept && DEPARTMENTS.some((d) => d.code === dept)) {
      setDeptCode(dept);
      setStep("doctor");
    }
    const doctor = searchParams.get("doctor");
    if (doctor) {
      setDoctorId(doctor);
      setStep("schedule");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPublicDoctors()
      .then((res) => setDoctors(res.items))
      .catch(() => setDoctors([]));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    void loadAppointments();
  }, [user, authLoading, router]);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      if (d.specialty_fa?.trim()) set.add(d.specialty_fa.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [doctors]);

  const deptsWithDoctors = useMemo(() => {
    const codes = new Set(doctors.map((d) => d.department_code).filter(Boolean));
    return DEPARTMENTS.filter((d) => codes.has(d.code));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      if (!ignoreDeptFilter && deptCode && d.department_code !== deptCode) return false;
      if (specialtyFilter && d.specialty_fa !== specialtyFilter) return false;
      if (!doctorSearch.trim()) return true;
      const q = doctorSearch.trim().toLowerCase();
      return (
        d.name_fa.toLowerCase().includes(q) ||
        (d.name_en || "").toLowerCase().includes(q) ||
        d.specialty_fa.toLowerCase().includes(q)
      );
    });
  }, [doctors, deptCode, doctorSearch, specialtyFilter, ignoreDeptFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetchMyAppointments(1, 50, statusFilter || undefined);
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const selectedDept = DEPARTMENTS.find((d) => d.code === deptCode);
  const deptName = selectedDept
    ? locale === "en"
      ? selectedDept.nameEn
      : selectedDept.nameFa
    : "";
  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!doctorId || !selectedDoctor || !deptCode) {
      setError(t("doctorRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const scheduled = new Date(`${date}T${time}:00`);
      if (scheduled <= new Date()) throw new Error(t("futureOnly"));

      await bookAppointment({
        scheduled_at: scheduled.toISOString(),
        department_code: deptCode,
        department_name: deptName,
        doctor_id: selectedDoctor.id,
        doctor_name: doctorDisplayName(locale, selectedDoctor),
        reason: reason || undefined,
        duration_min: 30,
      });
      setSuccess(t("bookSuccess"));
      setReason("");
      setStep("done");
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (id: string) => {
    if (!confirm("درخواست نوبت لغو شود؟")) return;
    try {
      await cancelAppointment(id, t("cancelNote"));
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cancelFailed"));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
      </div>
    );
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: t("statusPending"),
      confirmed: t("statusConfirmed"),
      cancelled: t("statusCancelled"),
      completed: t("statusCompleted"),
      no_show: "حاضر نشد",
    };
    return map[s] ?? s;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-10 lg:px-6 overflow-x-clip">
      <div className="mb-6 sm:mb-10 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-shomal-primary break-words">{t("title")}</h1>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">
          {t("welcome")} {user.first_name || user.phone}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="glass-premium rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-shomal-primary flex items-center gap-2">
              <Calendar className="h-5 w-5 shrink-0" />
              {t("bookNew")}
            </h2>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {(
                [
                  ["dept", "۱. بخش"],
                  ["doctor", "۲. پزشک"],
                  ["schedule", "۳. زمان"],
                ] as const
              ).map(([id, label]) => (
                <span
                  key={id}
                  className={clsx(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                    step === id || (step === "done" && id === "schedule")
                      ? "bg-[#003b8e] text-white"
                      : "bg-[#003b8e]/10 text-[#003b8e]",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>}
            {success && <div className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">{success}</div>}

            {step === "dept" && (
              <div className="space-y-4">
                <p className="text-sm text-muted">ابتدا بخش / تخصص را انتخاب کنید؛ سپس پزشک‌های همان بخش نمایش داده می‌شوند.</p>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.slice(0, 12).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => {
                          setSpecialtyFilter(sp);
                          setDeptCode("");
                          setIgnoreDeptFilter(true);
                          setDoctorId("");
                          setStep("doctor");
                        }}
                        className="rounded-full border border-[#003b8e]/20 bg-[#003b8e]/5 px-3 py-1.5 text-[11px] font-semibold text-[#003b8e] hover:bg-[#003b8e]/10"
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {(deptsWithDoctors.length ? deptsWithDoctors : DEPARTMENTS).map((d) => {
                    const count = doctors.filter((x) => x.department_code === d.code).length;
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => {
                          setDeptCode(d.code);
                          setSpecialtyFilter("");
                          setIgnoreDeptFilter(false);
                          setDoctorId("");
                          setStep("doctor");
                        }}
                        className="rounded-2xl border border-shomal-border bg-surface p-3 text-start text-sm font-semibold hover:border-[#003b8e]/40 hover:bg-[#003b8e]/5 min-w-0"
                      >
                        <span className="block truncate">{locale === "en" ? d.nameEn : d.nameFa}</span>
                        <span className="mt-1 block text-[11px] font-normal text-muted">{count} پزشک</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "doctor" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("dept");
                    setIgnoreDeptFilter(false);
                    setSpecialtyFilter("");
                  }}
                  className="text-xs font-semibold text-[#003b8e] inline-flex items-center gap-1"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  تغییر بخش{deptName ? ` (${deptName})` : specialtyFilter ? ` (${specialtyFilter})` : ""}
                </button>
                <Input
                  label="جستجوی پزشک"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="نام یا تخصص..."
                />
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {filteredDoctors.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted">پزشکی برای این بخش/تخصص نیست</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIgnoreDeptFilter(true);
                          setSpecialtyFilter("");
                        }}
                        className="text-sm font-semibold text-[#003b8e] hover:underline"
                      >
                        نمایش همه پزشکان
                      </button>
                    </div>
                  ) : (
                    filteredDoctors.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDoctorId(d.id);
                          if (!deptCode && d.department_code) setDeptCode(d.department_code);
                          setStep("schedule");
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 rounded-2xl border p-3 text-start transition",
                          doctorId === d.id
                            ? "border-[#003b8e] bg-[#003b8e]/5"
                            : "border-shomal-border bg-surface hover:border-[#003b8e]/30",
                        )}
                      >
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[#003b8e]/10 shrink-0">
                          {d.image_url ? (
                            <Image src={d.image_url} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <Stethoscope className="absolute inset-0 m-auto h-5 w-5 text-[#003b8e]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm truncate">{doctorDisplayName(locale, d)}</p>
                          <p className="text-xs text-muted truncate">{doctorDisplaySpecialty(locale, d)}</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 inline-flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            {(d.rating ?? 4.5).toFixed(1)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === "schedule" && selectedDoctor && (
              <form onSubmit={onBook} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep("doctor")}
                  className="text-xs font-semibold text-[#003b8e]"
                >
                  تغییر پزشک
                </button>
                <div className="rounded-2xl bg-[#003b8e]/5 p-3 text-sm">
                  <p className="font-bold">{doctorDisplayName(locale, selectedDoctor)}</p>
                  <p className="text-muted">{deptName || doctorDisplaySpecialty(locale, selectedDoctor)}</p>
                </div>
                <Input label={t("date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <div>
                  <p className="mb-2 text-sm font-semibold text-shomal-primary">{t("time")}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={clsx(
                          "rounded-xl border py-2 text-sm font-semibold tabular-nums transition",
                          time === slot
                            ? "border-[#003b8e] bg-[#003b8e] text-white"
                            : "border-shomal-border bg-surface hover:border-[#003b8e]/40",
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label={t("reason")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t("loading") : t("bookBtn")}
                </Button>
              </form>
            )}

            {step === "done" && (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="font-bold text-emerald-800 dark:text-emerald-300">درخواست ثبت شد</p>
                <p className="text-sm text-muted">پس از تأیید ادمین، وضعیت نوبت به‌روز می‌شود. می‌توانید لغو کنید یا وضعیت را ببینید.</p>
                <Button
                  type="button"
                  onClick={() => {
                    setStep("dept");
                    setDeptCode("");
                    setDoctorId("");
                    setSpecialtyFilter("");
                    setIgnoreDeptFilter(false);
                    setSuccess("");
                  }}
                >
                  نوبت جدید
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-shomal-primary flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("myAppointments")}
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-shomal-border px-3 py-2 text-sm bg-white"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="pending">در انتظار</option>
              <option value="confirmed">تأیید شده</option>
              <option value="cancelled">لغو شده</option>
              <option value="completed">انجام شده</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 sm:p-10 text-center text-gray-500 text-sm">
              {t("empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((apt) => (
                <div
                  key={apt.id}
                  className="glass-premium rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{apt.doctor_name || apt.department_name}</p>
                    <p className="text-sm text-gray-500 truncate">{apt.department_name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(apt.scheduled_at).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}
                    </p>
                    {apt.reason && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{apt.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        apt.status === "pending" && "bg-amber-100 text-amber-800",
                        apt.status === "confirmed" && "bg-green-100 text-green-800",
                        apt.status === "cancelled" && "bg-gray-100 text-gray-600",
                        apt.status === "completed" && "bg-sky-100 text-sky-800",
                      )}
                    >
                      {statusLabel(apt.status)}
                    </span>
                    {(apt.status === "pending" || apt.status === "confirmed") && (
                      <button
                        type="button"
                        onClick={() => void onCancel(apt.id)}
                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                        {t("cancel")}
                      </button>
                    )}
                    {apt.status === "confirmed" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
