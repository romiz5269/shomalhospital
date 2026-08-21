"use client";

import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function StatusLight({ status }: { status?: string }) {
  const cls =
    status === "critical" ? "status-critical" : status === "warning" ? "status-warning" : "status-ok";
  return (
    <span
      className={clsx("inline-block w-3 h-3 rounded-full shrink-0", cls)}
      title={status === "critical" ? "بحرانی" : status === "warning" ? "هشدار" : "سالم"}
    />
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  accent,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: "primary" | "warning" | "critical" | "accent";
  icon?: LucideIcon;
}) {
  const styles = {
    primary: { bg: "bg-[#003b8e]/10", icon: "text-[#003b8e]", val: "text-[#003b8e]" },
    warning: { bg: "bg-amber-100", icon: "text-amber-700", val: "text-amber-700" },
    critical: { bg: "bg-red-100", icon: "text-red-700", val: "text-red-700" },
    accent: { bg: "bg-[#0d9b8a]/12", icon: "text-[#0d9b8a]", val: "text-[#0d9b8a]" },
  };
  const s = styles[accent || "primary"];

  return (
    <div className="card-elevated p-5 sm:p-6 rounded-2xl card-hover border-[#c8d9ee]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#3d5470] mb-2">{title}</p>
          <p className={clsx("text-3xl sm:text-4xl font-black tracking-tight", s.val)}>{value}</p>
          {subtitle && <p className="text-xs font-bold text-[#6b8299] mt-2">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", s.bg)}>
            <Icon size={22} className={s.icon} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#003b8e] leading-tight">{title}</h1>
        {subtitle && <p className="text-[#3d5470] text-sm font-bold mt-2 leading-relaxed max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    danger: "btn-danger",
    accent: "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#0d9b8a] to-[#14b8a6] text-white font-bold px-5 py-2.5 shadow-md shadow-[#0d9b8a]/25 hover:brightness-105",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(styles[variant], "text-sm", disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4">
      <div className={`card-elevated w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} p-5 sm:p-7 max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-[#c8d9ee]`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#003b8e]">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[#003b8e]/8 text-[#3d5470] hover:text-[#003b8e] hover:bg-[#003b8e]/12 text-xl leading-none font-bold">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-4", className)}>
      <label className="block text-sm font-bold text-[#0a1628] mb-2">{label}</label>
      {children}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center border-2 border-dashed border-[#c8d9ee] bg-[#f8fafc] rounded-2xl">
      <p className="text-[#3d5470] text-sm font-bold">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "critical" | "success";
}) {
  const styles = {
    default: "bg-[#003b8e]/12 text-[#003b8e] border border-[#003b8e]/25",
    warning: "bg-amber-50 text-amber-900 border border-amber-300",
    critical: "bg-red-50 text-red-800 border border-red-300",
    success: "bg-emerald-50 text-emerald-900 border border-emerald-300",
  };
  return (
    <span className={clsx("inline-block text-xs font-black px-3 py-1 rounded-full", styles[variant])}>
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base sm:text-lg font-black text-[#003b8e]">{children}</h2>;
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("card-elevated p-5 sm:p-6 rounded-2xl border-[#c8d9ee]", className)}>
      {children}
    </div>
  );
}
