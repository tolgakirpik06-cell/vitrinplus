type ClassValue = string | number | null | boolean | undefined;

/**
 * Küçük bir className birleştirici. clsx/tailwind-merge kurulmadığı için
 * ekstra bağımlılık gerektirmeyen basit bir sürüm kullanıyoruz.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
