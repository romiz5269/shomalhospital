/** تبدیل تاریخ میلادی ↔ شمسی (بدون وابستگی خارجی) */

function div(a: number, b: number) {
  return ~~(a / b);
}

function mod(a: number, b: number) {
  return a - ~~(a / b) * b;
}

export function gregorianToJalaali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * div(days, 12053);
  days = mod(days, 12053);
  jy += 4 * div(days, 1461);
  days = mod(days, 1461);
  jy += div(days - 1, 365);
  if (days > 365) days = (days - 1) % 365;
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + mod(days < 186 ? days : days - 186, days < 186 ? 31 : 30);
  return { jy, jm, jd };
}

export function jalaaliToGregorian(jy: number, jm: number, jd: number) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div(mod(jy, 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days = mod(days, 146097);
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days = mod(days, 36524);
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days = mod(days, 1461);
  gy += div(days - 1, 365);
  if (days > 365) days = (days - 1) % 365;
  const gd = days + 1;
  const sal_a = [
    0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  let v = gd;
  for (gm = 0; gm < 13 && v > sal_a[gm]; gm++) v -= sal_a[gm];
  return { gy, gm, gd: v };
}

/** تبدیل اعداد لاتین به فارسی */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export type JalaliFields = {
  jy: number;
  jm: number;
  jd: number;
  hh: string;
  mm: string;
};

export function nowISO(): string {
  return new Date().toISOString();
}

export function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatWithJalaaliLib(d: Date, withTime: boolean): string {
  const { jy, jm, jd } = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const datePart = `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, "0"))}/${toPersianDigits(String(jd).padStart(2, "0"))} · ${MONTHS[jm - 1]}`;
  if (!withTime) return datePart;
  const hh = toPersianDigits(String(d.getHours()).padStart(2, "0"));
  const mm = toPersianDigits(String(d.getMinutes()).padStart(2, "0"));
  return `${datePart} · ${hh}:${mm}`;
}

/** نمایش تاریخ شمسی — زمان از ویندوز/مرورگر */
export function formatJalaliDate(value?: string | Date | null, withTime = false): string {
  const d = parseDate(value);
  if (!d) return "—";

  try {
    const opts: Intl.DateTimeFormatOptions = withTime
      ? {
          calendar: "persian",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {
          calendar: "persian",
          year: "numeric",
          month: "long",
          day: "numeric",
        };
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", opts).format(d);
  } catch {
    return formatWithJalaaliLib(d, withTime);
  }
}

export function formatJalaliShort(value?: string | Date | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  const { jy, jm, jd } = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

/** نمایش شمسی: ۲۴ مرداد ۱۴۰۴ */
export function formatJalaliDisplay(value?: string | Date | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  const { jy, jm, jd } = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${toPersianDigits(jd)} ${MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function isoToJalaliFields(iso?: string | null): JalaliFields {
  const base = iso ? parseDate(iso) : new Date();
  const d = base || new Date();
  const { jy, jm, jd } = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return {
    jy,
    jm,
    jd,
    hh: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
  };
}

export function jalaliFieldsToIso(fields: JalaliFields): string {
  const { gy, gm, gd } = jalaaliToGregorian(fields.jy, fields.jm, fields.jd);
  const d = new Date(gy, gm - 1, gd, Number(fields.hh) || 0, Number(fields.mm) || 0, 0, 0);
  return d.toISOString();
}

export function todayJalaliLabel(): string {
  return formatJalaliDate(new Date(), false);
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Tehran";
  }
}

/** تبدیل اعداد فارسی به لاتین */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** فرمت ورودی شمسی: ۱۴۰۴/۰۵/۲۴ */
export function formatJalaliInput(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return "";
  const { jy, jm, jd } = gregorianToJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toPersianDigits(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

/** پارس ورودی 1404/05/24 یا 1404-5-24 */
export function parseJalaliInput(input: string): string | undefined {
  const s = toLatinDigits(input.trim()).replace(/-/g, "/");
  const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return undefined;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return undefined;
  return jalaliFieldsToIso({ jy, jm, jd, hh: "00", mm: "00" });
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function nowIsoWithTime(): string {
  return new Date().toISOString();
}
