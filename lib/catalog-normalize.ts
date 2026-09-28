/** Shared with catalog_normalize SQL; independent from the demo catalog. */
export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function pageNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(10000, Math.floor(number))) : 1;
}
