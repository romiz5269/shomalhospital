"use client";



import { useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import { useTranslations, useLocale } from "next-intl";

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

  fetchPublicDoctors,

  type DoctorOut,

} from "@/lib/cms-client";

import type { AppointmentOut } from "@/lib/types";

import { Calendar, Clock, XCircle, CheckCircle2, Loader2 } from "lucide-react";

import clsx from "clsx";



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



  const [date, setDate] = useState("");

  const [time, setTime] = useState("10:00");

  const [deptCode, setDeptCode] = useState<string>(DEPARTMENTS[0].code);

  const [doctorId, setDoctorId] = useState("");

  const [reason, setReason] = useState("");



  useEffect(() => {

    const dept = searchParams.get("dept");

    if (dept && DEPARTMENTS.some((d) => d.code === dept)) {

      setDeptCode(dept);

    }

    const doctor = searchParams.get("doctor");

    if (doctor) setDoctorId(doctor);

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

    loadAppointments();

  }, [user, authLoading, router]);



  const filteredDoctors = useMemo(

    () => doctors.filter((d) => !deptCode || d.department_code === deptCode),

    [doctors, deptCode],

  );



  useEffect(() => {

    if (doctorId && !filteredDoctors.some((d) => d.id === doctorId)) {

      setDoctorId("");

    }

  }, [deptCode, filteredDoctors, doctorId]);



  const loadAppointments = async () => {

    setLoading(true);

    try {

      const res = await fetchMyAppointments();

      setItems(res.items);

    } catch (err) {

      setError(err instanceof Error ? err.message : t("loadFailed"));

    } finally {

      setLoading(false);

    }

  };



  const selectedDept = DEPARTMENTS.find((d) => d.code === deptCode)!;

  const deptName = locale === "en" ? selectedDept.nameEn : selectedDept.nameFa;

  const selectedDoctor = doctors.find((d) => d.id === doctorId);



  const onBook = async (e: React.FormEvent) => {

    e.preventDefault();

    setError("");

    setSuccess("");

    if (!doctorId || !selectedDoctor) {

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

      await loadAppointments();

    } catch (err) {

      setError(err instanceof Error ? err.message : t("bookFailed"));

    } finally {

      setSubmitting(false);

    }

  };



  const onCancel = async (id: string) => {

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

    };

    return map[s] ?? s;

  };



  return (

    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">

      <div className="mb-10">

        <h1 className="text-3xl font-bold text-shomal-primary">{t("title")}</h1>

        <p className="text-gray-500 mt-2">

          {t("welcome")} {user.first_name || user.phone}

        </p>

      </div>



      <div className="grid lg:grid-cols-5 gap-8">

        <form onSubmit={onBook} className="lg:col-span-2 glass-premium rounded-3xl p-6 sm:p-8 space-y-4 h-fit">

          <h2 className="text-xl font-bold text-shomal-primary flex items-center gap-2">

            <Calendar className="h-5 w-5" />

            {t("bookNew")}

          </h2>



          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>}

          {success && <div className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">{success}</div>}



          <div>

            <label className="mb-2 block text-sm font-medium">{t("department")}</label>

            <select

              value={deptCode}

              onChange={(e) => setDeptCode(e.target.value)}

              className="w-full rounded-2xl border border-shomal-border bg-white px-4 py-3.5 text-sm outline-none focus:border-shomal-primary focus:ring-4 focus:ring-shomal-primary/10"

            >

              {DEPARTMENTS.map((d) => (

                <option key={d.code} value={d.code}>

                  {locale === "en" ? d.nameEn : d.nameFa}

                </option>

              ))}

            </select>

          </div>



          <div>

            <label className="mb-2 block text-sm font-medium">{t("doctor")}</label>

            <select

              value={doctorId}

              onChange={(e) => setDoctorId(e.target.value)}

              required

              className="w-full rounded-2xl border border-shomal-border bg-white px-4 py-3.5 text-sm outline-none focus:border-shomal-primary focus:ring-4 focus:ring-shomal-primary/10"

            >

              <option value="">{t("selectDoctor")}</option>

              {filteredDoctors.map((d) => (

                <option key={d.id} value={d.id}>

                  {doctorDisplayName(locale, d)} — {d.specialty_fa}

                </option>

              ))}

            </select>

          </div>



          <div className="grid grid-cols-2 gap-3">

            <Input label={t("date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

            <Input label={t("time")} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />

          </div>

          <Input label={t("reason")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />

          <Button type="submit" className="w-full" disabled={submitting}>

            {submitting ? t("loading") : t("bookBtn")}

          </Button>

        </form>



        <div className="lg:col-span-3">

          <h2 className="text-xl font-bold text-shomal-primary mb-4 flex items-center gap-2">

            <Clock className="h-5 w-5" />

            {t("myAppointments")}

          </h2>



          {loading ? (

            <div className="flex justify-center py-16">

              <Loader2 className="h-8 w-8 animate-spin text-shomal-primary" />

            </div>

          ) : items.length === 0 ? (

            <div className="glass-card rounded-3xl p-10 text-center text-gray-500">

              {t("empty")}

            </div>

          ) : (

            <div className="space-y-4">

              {items.map((apt) => (

                <div key={apt.id} className="glass-premium rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 hover:shadow-lg transition-shadow">

                  <div>

                    <p className="font-bold text-gray-900">

                      {apt.doctor_name || apt.department_name}

                    </p>

                    <p className="text-sm text-gray-500">{apt.department_name}</p>

                    <p className="text-sm text-gray-500 mt-1">

                      {new Date(apt.scheduled_at).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}

                    </p>

                    {apt.reason && <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>}

                  </div>

                  <div className="flex items-center gap-3">

                    <span className={clsx(

                      "rounded-full px-3 py-1 text-xs font-semibold",

                      apt.status === "pending" && "bg-amber-100 text-amber-800",

                      apt.status === "confirmed" && "bg-green-100 text-green-800",

                      apt.status === "cancelled" && "bg-gray-100 text-gray-600",

                    )}>

                      {statusLabel(apt.status)}

                    </span>

                    {apt.status !== "cancelled" && apt.status !== "completed" && (

                      <button

                        type="button"

                        onClick={() => onCancel(apt.id)}

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

