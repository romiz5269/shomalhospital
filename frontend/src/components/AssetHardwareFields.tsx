"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui";
import { api, Asset } from "@/lib/api";
import { isAdmin } from "@/lib/roles";
import { AssetFieldDef, getAssetFieldGroups } from "@/lib/assetFields";

type Props = {
  assetType: string;
  form: Partial<Asset>;
  onChange: (patch: Partial<Asset>) => void;
  showWindows?: boolean;
  windowsActivatedAt?: string;
  onWindowsActivatedChange?: (iso: string | undefined) => void;
  WindowsDateInput?: React.ComponentType<{ value?: string; onChange: (iso: string | undefined) => void }>;
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AssetFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select" && field.options) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function AssetHardwareFields({
  assetType,
  form,
  onChange,
  showWindows,
  windowsActivatedAt,
  onWindowsActivatedChange,
  WindowsDateInput,
}: Props) {
  const [admin, setAdmin] = useState(false);
  const groups = getAssetFieldGroups(assetType);

  useEffect(() => {
    api.me().then((u) => setAdmin(isAdmin(u.role))).catch(() => setAdmin(false));
  }, []);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.title}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#c8d9ee]"
        >
          <p className="sm:col-span-2 font-black text-sm text-[#003b8e]">{group.title}</p>
          {group.fields.map((field) => (
            <FormField key={field.key} label={field.label}>
              <FieldInput
                field={field}
                value={String((form as Record<string, unknown>)[field.key] ?? "")}
                onChange={(v) => onChange({ [field.key]: v || undefined } as Partial<Asset>)}
              />
            </FormField>
          ))}
        </div>
      ))}

      {showWindows && admin && assetType !== "printer" && assetType !== "network" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#c8d9ee]">
          <p className="sm:col-span-2 font-black text-sm text-[#003b8e]">لایسنس ویندوز</p>
          <FormField label="کلید ویندوز">
            <input
              value={form.windows_key || ""}
              onChange={(e) => onChange({ windows_key: e.target.value })}
            />
          </FormField>
          {WindowsDateInput && onWindowsActivatedChange && (
            <FormField label="تاریخ فعال‌سازی ویندوز">
              <WindowsDateInput value={windowsActivatedAt} onChange={onWindowsActivatedChange} />
            </FormField>
          )}
        </div>
      )}
    </div>
  );
}
