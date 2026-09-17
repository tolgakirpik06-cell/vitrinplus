import Link from "next/link";
import { CheckCircle2, ClipboardList, Home } from "lucide-react";
import { applicationStatusLabels } from "@/types/seller-application";
import type { ApplicationStatus } from "@/types/seller-application";

export function SellerSuccess({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <CheckCircle2 size={32} />
      </span>

      <div>
        <h2 className="text-xl font-extrabold text-navy-900 sm:text-2xl">Başvurunuz Alındı</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-500">
          VitrinPlus satıcı başvurunuz başarıyla oluşturuldu. Bilgileriniz
          doğrulandıktan sonra mağazanızı kullanmaya başlayabilirsiniz.
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-navy-100 bg-navy-50/50 px-6 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Başvuru Numarası</p>
        <p className="text-lg font-extrabold text-navy-900">{applicationId}</p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          {applicationStatusLabels[status]}
        </span>
      </div>

      <p className="max-w-md text-xs leading-relaxed text-navy-400">
        Şu anda başvuruları otomatik onaylayan bir sistemimiz yok. Ekibimiz
        belgelerinizi ve bilgilerinizi inceledikten sonra sizinle e-posta veya
        telefon yoluyla iletişime geçecektir.
      </p>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/satici-basvuru/durum"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-navy-100 px-6 py-3 text-sm font-semibold text-navy-700 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <ClipboardList size={16} />
          Başvuru Durumunu Gör
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Home size={16} />
          VitrinPlus Ana Sayfasına Dön
        </Link>
      </div>
    </div>
  );
}
