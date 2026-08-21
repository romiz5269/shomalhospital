"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { PageHeader, Panel, Badge, Btn, FormField } from "@/components/ui";
import { api, SystemInfo, NetworkInterface, getToken, setApiBase, UserProfile } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { Globe, Monitor, Server, Wifi, Loader2, RefreshCw, Search } from "lucide-react";

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export default function SystemPage() {
  const router = useRouter();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);

  const load = () => api.systemInfo().then(setInfo).catch(() => setInfo(null));

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.me().then(setMe).catch(() => {});
    load();
  }, [router]);

  const runScan = async () => {
    setScanning(true);
    setScanError(null);
    setSuccessUrl(null);
    try {
      const data = await api.networkScan();
      setIfaces(data.interfaces || []);
      const hospital = (data.interfaces || []).filter((i) => i.is_hospital_range);
      if (hospital.length >= 1) setSelectedIp(hospital[0].ip);
      else if (data.interfaces?.length === 1) setSelectedIp(data.interfaces[0].ip);
      else setSelectedIp(null);
      if (!data.interfaces?.length) {
        setScanError("IP فعالی روی سرور پیدا نشد — IP را دستی وارد کنید.");
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "خطا در اسکن شبکه");
      setIfaces([]);
    } finally {
      setScanning(false);
    }
  };

  const connectWithIp = async (ip: string) => {
    if (!IPV4.test(ip)) {
      alert("فرمت IP نامعتبر است");
      return;
    }
    setConnecting(true);
    try {
      const res = await api.setNetworkMode("network", ip);
      setApiBase(res.api_url);
      setSuccessUrl(res.frontend_url);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا");
    } finally {
      setConnecting(false);
    }
  };

  const confirmConnect = () => {
    if (selectedIp) connectWithIp(selectedIp);
  };

  const backToLocal = async () => {
    setConnecting(true);
    try {
      const res = await api.setNetworkMode("local");
      setApiBase(res.api_url);
      setSuccessUrl(null);
      setIfaces([]);
      setSelectedIp(null);
      setManualIp("");
      load();
    } finally {
      setConnecting(false);
    }
  };

  if (!info) {
    return <AppLayout><div className="text-center text-[#3d5470] font-bold py-20">در حال بارگذاری...</div></AppLayout>;
  }

  const modeLabel = info.network_mode === "network" && info.network_ip
    ? `شبکه (IP: ${info.network_ip})`
    : "محلی";

  return (
    <AppLayout>
      <PageHeader title="دسترسی شبکه" />

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Globe className="text-[#003b8e]" size={24} />
          <h2 className="font-black text-[#003b8e] text-xl">وضعیت فعلی</h2>
          <Badge variant={info.network_mode === "network" ? "success" : "warning"}>حالت فعلی: {modeLabel}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-[#003b8e]/20 bg-[#eef4fb] p-5">
            <div className="flex items-center gap-2 mb-2"><Monitor size={18} /><span className="font-black text-[#003b8e]">UI</span></div>
            <p className="font-mono text-lg font-black break-all">{info.frontend_url}</p>
          </div>
          <div className="rounded-2xl border-2 border-[#0d9b8a]/25 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-2 mb-2"><Server size={18} /><span className="font-black text-[#0d9b8a]">API</span></div>
            <p className="font-mono text-sm font-black break-all">{info.api_url}</p>
          </div>
        </div>
      </Panel>

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Search className="text-[#003b8e]" size={22} />
          <h2 className="font-black text-[#003b8e] text-lg">پیدا کردن IP در شبکه</h2>
        </div>
        {!isAdmin(me?.role) ? (
          <p className="text-sm font-bold text-[#3d5470]">تغییر حالت شبکه فقط برای مدیر است.</p>
        ) : (
          <>

        <div className="flex flex-wrap gap-2 mb-4">
          <Btn onClick={runScan} disabled={scanning}>
            {scanning ? (
              <><Loader2 className="inline animate-spin ml-2" size={16} /> در حال جستجو...</>
            ) : (
              <><Wifi size={16} className="ml-1" /> پیدا کردن IP شبکه</>
            )}
          </Btn>
          <Btn variant="ghost" onClick={runScan} disabled={scanning}>
            <RefreshCw size={16} className="ml-1" /> اسکن مجدد
          </Btn>
        </div>

        {scanError && (
          <p className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">{scanError}</p>
        )}

        {ifaces.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {ifaces.map((i) => (
              <button
                key={`${i.interface}-${i.ip}`}
                type="button"
                onClick={() => setSelectedIp(i.ip)}
                className={`text-right p-4 rounded-2xl border-2 transition-all ${selectedIp === i.ip ? "border-[#003b8e] bg-[#003b8e]/5" : "border-[#c8d9ee] bg-white"}`}
              >
                <p className="font-black text-[#0a1628] font-mono">{i.ip}</p>
                <p className="text-xs text-[#6b8299] mt-1">{i.interface}</p>
                {i.is_hospital_range && <Badge variant="success">شبکه ۱۰.۱.x.x</Badge>}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 p-4 rounded-2xl border border-[#c8d9ee] bg-[#f8fafc]">
          <FormField label="یا IP را دستی وارد کنید">
            <div className="flex flex-wrap gap-2">
              <input
                className="font-mono flex-1 min-w-[160px]"
                placeholder="10.1.5.23"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value.trim())}
              />
              <Btn variant="ghost" onClick={() => connectWithIp(manualIp)} disabled={connecting || !manualIp}>
                اتصال با IP دستی
              </Btn>
            </div>
          </FormField>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn onClick={confirmConnect} disabled={!selectedIp || connecting}>
            {connecting ? "..." : "تأیید و اتصال به شبکه"}
          </Btn>
          <Btn variant="ghost" onClick={backToLocal} disabled={connecting}>بازگشت به حالت محلی</Btn>
        </div>

        {successUrl && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="font-black text-emerald-800 mb-2">اتصال برقرار شد</p>
            <p className="font-mono text-sm break-all">{successUrl}</p>
            <button type="button" className="text-xs font-bold text-[#003b8e] mt-2" onClick={() => navigator.clipboard?.writeText(successUrl)}>کپی آدرس</button>
          </div>
        )}
          </>
        )}
      </Panel>

      <Panel>
        <p className="text-sm font-bold text-[#3d5470]">IP محلی سرور: <span className="text-[#003b8e]">{info.local_ip}</span></p>
      </Panel>
    </AppLayout>
  );
}
