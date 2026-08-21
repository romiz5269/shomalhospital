export type AssetFieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export const operationalStatusOptions = [
  { value: "active", label: "فعال (Active)" },
  { value: "inactive", label: "غیرفعال (Inactive)" },
  { value: "offline", label: "Offline" },
  { value: "faulty", label: "معیوب (Faulty)" },
  { value: "repair", label: "در تعمیر (Repair)" },
  { value: "retired", label: "از رده خارج (Retired)" },
  { value: "missing", label: "مفقود (Missing)" },
];

const baseIdentity: AssetFieldDef[] = [
  { key: "asset_code", label: "کد اموال" },
  { key: "hostname", label: "نام کامپیوتر / Hostname" },
  { key: "assigned_to", label: "کاربر / مسئول" },
  { key: "unit", label: "واحد" },
  { key: "location", label: "محل استقرار" },
  { key: "ip_address", label: "IP" },
  { key: "mac_address", label: "MAC" },
  { key: "brand", label: "برند" },
  { key: "model", label: "مدل" },
  { key: "serial_number", label: "Serial Number" },
];

const pcHardware: AssetFieldDef[] = [
  { key: "cpu", label: "CPU" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Storage" },
  { key: "gpu", label: "GPU" },
  { key: "monitor", label: "Monitor" },
];

const serverHardware: AssetFieldDef[] = [
  { key: "cpu", label: "CPU" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Storage" },
  { key: "raid", label: "RAID" },
  { key: "virtualization", label: "Virtualization" },
  { key: "hypervisor", label: "Hypervisor" },
  { key: "rack", label: "Rack" },
  { key: "power_info", label: "Power" },
  { key: "network_info", label: "Network", type: "textarea", placeholder: "VLAN، سوئیچ، پورت..." },
  { key: "services_info", label: "Services", type: "textarea", placeholder: "هر سرویس در یک خط — برای Down: down:نام سرویس" },
];

const networkHardware: AssetFieldDef[] = [
  { key: "network_info", label: "پیکربندی شبکه", type: "textarea" },
  { key: "power_info", label: "Power / PoE" },
];

const osFields: AssetFieldDef[] = [
  { key: "os_name", label: "سیستم‌عامل (OS)" },
  { key: "os_version", label: "نسخه OS" },
];

export function getAssetFieldGroups(assetType: string) {
  const t = assetType || "pc";
  const groups: { title: string; fields: AssetFieldDef[] }[] = [
    {
      title: "شناسنامه سیستم",
      fields: [
        ...baseIdentity,
        {
          key: "operational_status",
          label: "وضعیت",
          type: "select",
          options: operationalStatusOptions,
        },
      ],
    },
  ];

  if (t === "pc") {
    groups.push({ title: "سخت‌افزار", fields: pcHardware });
    groups.push({ title: "سیستم‌عامل", fields: osFields });
  } else if (t === "server") {
    groups.push({ title: "مشخصات سرور", fields: serverHardware });
    groups.push({ title: "سیستم‌عامل", fields: osFields });
  } else if (t === "network") {
    groups.push({ title: "مشخصات شبکه", fields: networkHardware });
  } else if (t === "printer") {
    groups.push({
      title: "مشخصات پرینتر",
      fields: [
        { key: "toner_type", label: "نوع تونر / کارتریج" },
      ],
    });
  }

  return groups;
}

export function operationalStatusLabel(status?: string) {
  return operationalStatusOptions.find((o) => o.value === status)?.label || status || "—";
}
