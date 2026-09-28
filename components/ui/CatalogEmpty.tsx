export function CatalogEmpty({ message = "Henüz yayında ürün yok. Yeni ürünler eklendiğinde burada görünecek." }: { message?: string }) {
  return <div className="rounded-2xl border border-dashed border-navy-100 bg-white/60 px-6 py-12 text-center text-sm text-navy-500">{message}</div>;
}
