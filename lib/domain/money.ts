/** Para yardımcıları. Tutarlar TL, iki ondalık basamakla tutulur (veritabanı numeric(12,2) ile aynı). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sum2(values: readonly number[]): number {
  return round2(values.reduce((total, value) => total + value, 0));
}
