import { Sparkles } from "lucide-react";

/**
 * Satıcı panelindeki henüz geliştirilmemiş bölümler için dürüst "Yakında"
 * durumu. Boş tepki vermek ya da sahte veri/başarı göstermek yerine (madde
 * 6, 22) burada olduğu gibi açıkça bilgilendirme yapılır.
 */
export function SellerComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy-100 bg-navy-50/30 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Sparkles size={22} />
      </span>
      <p className="text-sm font-bold text-navy-900">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-navy-400">{description}</p>
      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">Yakında</span>
    </div>
  );
}
