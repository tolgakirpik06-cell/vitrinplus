const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const integerFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

/** 1234.5 -> "1.234,5" */
export function formatNumber(value: number): string {
  return numberFormat.format(Number.isFinite(value) ? value : 0);
}

/** 1234.5 -> "1.235" */
export function formatInteger(value: number): string {
  return integerFormat.format(Number.isFinite(value) ? value : 0);
}

/** Tablolarda kullanılan "899 TL" biçimi. */
export function formatTL(value: number): string {
  return `${formatNumber(Math.round(value * 100) / 100)} TL`;
}

/** Ön ekli işaretli TL: +279 TL / -120 TL */
export function formatSignedTL(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : rounded < 0 ? "-" : ""}${formatNumber(Math.abs(rounded))} TL`;
}

/** 31.03 -> "%31,0" */
export function formatPercent(value: number, digits = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `%${safe.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** ISO -> "23 Eyl 2025, 14:32" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatShortDate(iso)}, ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** ISO -> "23 Eyl 2025" */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

/** ISO -> "23 Eyl 14:32" */
export function formatCompactDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Yerel gün anahtarı: "2026-09-20" (grafik gruplaması için). */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Bugün 14:32", "Dün 11:24" veya "20 Eyl 14:32" */
export function formatRelativeDay(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const time = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (diffDays === 0) return `Bugün ${time}`;
  if (diffDays === 1) return `Dün ${time}`;
  return formatCompactDateTime(iso);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
