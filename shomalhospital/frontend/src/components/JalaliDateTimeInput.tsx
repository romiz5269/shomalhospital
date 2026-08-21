"use client";

import { useEffect, useState } from "react";
import {
  formatJalaliDate,
  formatJalaliDisplay,
  formatJalaliInput,
  isoToJalaliFields,
  jalaliFieldsToIso,
  parseJalaliInput,
  todayIso,
} from "@/lib/dates";

type JalaliDateTimeInputProps = {
  value?: string | null;
  onChange: (iso: string | undefined) => void;
  required?: boolean;
  withTime?: boolean;
};

export function JalaliDateTimeInput({ value, onChange, required, withTime }: JalaliDateTimeInputProps) {
  const [text, setText] = useState("");
  const [hh, setHh] = useState("09");
  const [mm, setMm] = useState("00");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatJalaliInput(value));
    if (withTime && value) {
      const f = isoToJalaliFields(value);
      setHh(f.hh);
      setMm(f.mm);
    }
    setInvalid(false);
  }, [value, withTime]);

  const emit = (dateText: string, hour = hh, minute = mm) => {
    if (!dateText.trim()) {
      setInvalid(false);
      onChange(undefined);
      return;
    }
    const baseIso = parseJalaliInput(dateText);
    if (!baseIso) {
      setInvalid(true);
      return;
    }
    if (!withTime) {
      setInvalid(false);
      onChange(baseIso);
      setText(formatJalaliInput(baseIso));
      return;
    }
    const f = isoToJalaliFields(baseIso);
    const iso = jalaliFieldsToIso({ ...f, hh: hour.padStart(2, "0"), mm: minute.padStart(2, "0") });
    setInvalid(false);
    onChange(iso);
    setText(formatJalaliInput(iso));
  };

  const commit = (raw: string) => emit(raw, hh, mm);

  const setToday = () => {
    const nowFields = isoToJalaliFields(new Date().toISOString());
    const hour = withTime ? hh : "00";
    const minute = withTime ? mm : "00";
    const iso = jalaliFieldsToIso({ ...nowFields, hh: hour, mm: minute });
    onChange(iso);
    setText(formatJalaliInput(iso));
    setInvalid(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          dir="rtl"
          className={`flex-1 text-center font-bold text-base tracking-wider rounded-xl border-2 py-2.5 px-3 ${
            invalid ? "border-red-400 bg-red-50" : "border-[#c8d9ee]"
          }`}
          placeholder="۱۴۰۴/۰۵/۲۴"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          onBlur={() => commit(text)}
          onKeyDown={(e) => e.key === "Enter" && commit(text)}
          required={required}
        />
        <button
          type="button"
          onClick={() => setToday()}
          className="shrink-0 rounded-xl border-2 border-[#0d9b8a] bg-[#0d9b8a]/10 px-4 py-2 text-sm font-black text-[#0d9b8a] hover:bg-[#0d9b8a]/20"
        >
          امروز
        </button>
      </div>
      {withTime && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-bold text-[#6b8299]">ساعت</span>
          <input
            type="number"
            min={0}
            max={23}
            value={Number(hh)}
            onChange={(e) => {
              const h = String(Math.min(23, Math.max(0, Number(e.target.value) || 0))).padStart(2, "0");
              setHh(h);
              if (text.trim()) emit(text, h, mm);
            }}
            className="w-16 text-center rounded-xl border-2 border-[#c8d9ee] py-2 font-bold"
          />
          <span className="font-black text-[#003b8e]">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={Number(mm)}
            onChange={(e) => {
              const m = String(Math.min(59, Math.max(0, Number(e.target.value) || 0))).padStart(2, "0");
              setMm(m);
              if (text.trim()) emit(text, hh, m);
            }}
            className="w-16 text-center rounded-xl border-2 border-[#c8d9ee] py-2 font-bold"
          />
        </div>
      )}
      {value && !invalid && (
        <p className="text-sm font-black text-[#003b8e] text-center">
          {withTime ? formatJalaliDate(value, true) : formatJalaliDisplay(value)}
        </p>
      )}
      {invalid && <p className="text-xs font-bold text-red-600 text-center">فرمت: ۱۴۰۴/۰۵/۲۴</p>}
    </div>
  );
}

export function JalaliDate({ value, time }: { value?: string | Date | null; time?: boolean }) {
  return (
    <span className="font-bold text-[#003b8e]">
      {time ? formatJalaliDate(value, true) : formatJalaliDisplay(value)}
    </span>
  );
}
