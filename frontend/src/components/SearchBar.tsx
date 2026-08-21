"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import { api, SearchResult } from "@/lib/api";
import { WORK_MODULE } from "@/lib/workLabels";



export function SearchBar({ onNavigate }: { onNavigate?: () => void }) {

  const router = useRouter();

  const [q, setQ] = useState("");

  const [results, setResults] = useState<SearchResult | null>(null);

  const [loading, setLoading] = useState(false);



  const search = async (term: string) => {

    setQ(term);

    if (term.trim().length < 2) {

      setResults(null);

      return;

    }

    setLoading(true);

    try {

      const data = await api.search(term.trim());

      setResults(data);

    } catch {

      setResults(null);

    } finally {

      setLoading(false);

    }

  };



  const go = (path: string) => {

    setResults(null);

    setQ("");

    onNavigate?.();

    router.push(path);

  };



  const total = results

    ? results.assets.length +

      results.pm_visits.length +

      results.inventory.length +

      results.reminders.length

    : 0;



  return (

    <div className="relative max-w-xl w-full">

      <div className="relative search-field">

        <Search size={18} strokeWidth={2.25} className="search-icon" />

        <input

          type="search"

          value={q}

          onChange={(e) => search(e.target.value)}

          placeholder={`جستجو در تجهیزات، ${WORK_MODULE.short}، کالا...`}

          className="text-sm rounded-2xl border-2 border-[#c8d9ee] shadow-sm w-full"

        />

      </div>

      {loading && <p className="text-xs text-[#3d5470] font-bold mt-1">در حال جستجو...</p>}

      {results && total > 0 && (

        <div className="absolute top-full mt-2 w-full card-elevated z-50 p-3 shadow-lg max-h-80 overflow-y-auto rounded-2xl">

          {results.assets.length > 0 && (

            <p className="text-[10px] font-black text-[#6b8299] px-2 pb-1">تجهیزات</p>

          )}

          {results.assets.map((a) => (

            <button

              key={`a-${a.id}`}

              onClick={() => go(`/assets?q=${encodeURIComponent(q)}&id=${a.id}`)}

              className="w-full text-right p-2.5 rounded-xl hover:bg-[#003b8e]/8 text-sm font-bold"

            >

              <span className="text-[#003b8e]">{a.name}</span>

              <span className="text-[#6b8299] mr-2 text-xs">{a.serial || a.type}</span>

            </button>

          ))}

          {results.pm_visits.length > 0 && (

            <p className="text-[10px] font-black text-[#6b8299] px-2 pt-2 pb-1">{WORK_MODULE.title}</p>

          )}

          {results.pm_visits.map((v) => (

            <button

              key={`v-${v.id}`}

              onClick={() => go(`/pm-visits?q=${encodeURIComponent(q)}&id=${v.id}`)}

              className="w-full text-right p-2.5 rounded-xl hover:bg-[#003b8e]/8 text-sm font-bold"

            >

              <span className="text-[#003b8e]">{v.label}</span>

              {(v.unit || v.asset_name) && (

                <span className="text-[#6b8299] mr-2 text-xs">{[v.unit, v.asset_name].filter(Boolean).join(" · ")}</span>

              )}

            </button>

          ))}

          {results.inventory.length > 0 && (

            <p className="text-[10px] font-black text-[#6b8299] px-2 pt-2 pb-1">کالای جدید</p>

          )}

          {results.inventory.map((i) => (

            <button

              key={`i-${i.id}`}

              onClick={() => go(`/inventory?q=${encodeURIComponent(q)}&id=${i.id}`)}

              className="w-full text-right p-2.5 rounded-xl hover:bg-[#003b8e]/8 text-sm font-bold"

            >

              <span className="text-[#003b8e]">{i.name}</span>

              <span className="text-[#6b8299] mr-2 text-xs">{i.category}</span>

            </button>

          ))}

          {results.reminders.length > 0 && (

            <p className="text-[10px] font-black text-[#6b8299] px-2 pt-2 pb-1">هشدارها</p>

          )}

          {results.reminders.map((r) => (

            <button

              key={`r-${r.id}`}

              onClick={() => go(`/reminders?id=${r.id}`)}

              className="w-full text-right p-2.5 rounded-xl hover:bg-[#003b8e]/8 text-sm font-bold text-[#0a1628]"

            >

              {r.title}

            </button>

          ))}

        </div>

      )}

      {results && total === 0 && q.trim().length >= 2 && (

        <div className="absolute top-full mt-2 w-full card-elevated z-50 p-3 text-sm text-[#3d5470] font-bold rounded-2xl">

          نتیجه‌ای یافت نشد

        </div>

      )}

    </div>

  );

}

