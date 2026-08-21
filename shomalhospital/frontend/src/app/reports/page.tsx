"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Btn } from "@/components/ui";
import { api, getToken } from "@/lib/api";
import { FileSpreadsheet } from "lucide-react";
import { WORK_MODULE } from "@/lib/workLabels";

const reportTypes = [
  { id: "assets", label: "تجهیزات" },
  { id: "pm_visits", label: WORK_MODULE.title },
  { id: "inventory", label: "کالای جدید" },
  { id: "reminders", label: "هشدارها" },
  { id: "all", label: "همه" },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  const download = async (type: string) => {
    setLoading(type);
    try {
      const blob = await api.exportReport(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${type}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("خطا در تولید گزارش");
    } finally {
      setLoading("");
    }
  };

  return (
    <AppLayout>
      <PageHeader title="گزارش‌ها" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportTypes.map((rt) => (
          <div key={rt.id} className="card p-7 rounded-2xl">
            <h3 className="font-black text-[#003b8e] mb-5 text-lg">{rt.label}</h3>
            <Btn onClick={() => download(rt.id)} disabled={loading === rt.id} className="w-full text-base py-3">
              <FileSpreadsheet size={16} className="ml-1 inline" />
              {loading === rt.id ? "در حال تولید..." : "دانلود Excel"}
            </Btn>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
