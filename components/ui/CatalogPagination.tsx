import Link from "next/link";
export function CatalogPagination({ page, total, size, path, params = {} }: { page: number; total: number; size: number; path: string; params?: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (target: number) => `${path}?${new URLSearchParams({ ...params, sayfa: String(target) })}`;
  if (pages <= 1 && page === 1) return null;
  return <nav aria-label="Sayfalar" className="flex items-center justify-center gap-5 py-4 text-sm text-navy-600">
    {page > 1 && <Link href={href(page - 1)}>Önceki</Link>}
    <span>{page} / {pages}</span>
    {page < pages && <Link href={href(page + 1)}>Sonraki</Link>}
  </nav>;
}
