"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { FileDropzone } from "@/components/seller-application/FileDropzone";
import { validateSellerDocument } from "@/lib/domain/seller-documents";
import { friendlyError } from "@/lib/domain/errors";
import { sellerDocumentConfig } from "@/lib/seller-application";
import type { SellerApplicationData, SellerDocumentKey } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

/** Dosya tür/boyut sorunu varsa kullanıcıya gösterilecek Türkçe metin; yoksa `null`. */
function fileProblem(file: File): string | null {
  try {
    validateSellerDocument({ type: file.type, size: file.size });
    return null;
  } catch (error) {
    return friendlyError(error);
  }
}

export function SellerDocumentsStep({
  data,
  errors,
  setData,
  live = false,
  setFile,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
  /** Gerçek hesap modu: dosyalar gönderimde özel depolamaya yüklenir. Demo modunda yalnızca dosya bilgisi tutulur. */
  live?: boolean;
  /** Gerçek modda seçilen dosyanın kendisini (bellekte) üst bileşene verir. */
  setFile?: (key: SellerDocumentKey, file: File | null) => void;
}) {
  const sellerType = data.sellerType;
  const visibleDocs = sellerDocumentConfig.filter(
    (doc) => !sellerType || doc.sellerTypes.includes(sellerType)
  );

  return (
    <StepShell
      title="Belgeler"
      subtitle="Satıcı tipinize göre istenen belgeleri yükleyin. Kabul edilen formatlar: PDF, JPG, PNG (en fazla 10 MB)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleDocs.map((doc) => (
          <FileDropzone
            key={doc.key}
            id={doc.key}
            label={doc.label}
            description={doc.description}
            required
            value={data.documents[doc.key]}
            error={errors[doc.key]}
            validateFile={live ? fileProblem : undefined}
            selectedLabel={live ? "gönderilmeye hazır" : "yüklendi"}
            onChange={(meta, file) => {
              setFile?.(doc.key, file);
              setData((prev) => ({
                ...prev,
                documents: { ...prev.documents, [doc.key]: meta ?? undefined },
              }));
            }}
          />
        ))}
      </div>

      {live ? (
        <p className="flex items-start gap-2.5 rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3 text-xs leading-relaxed text-navy-600">
          <Lock size={15} className="mt-0.5 shrink-0" />
          Belgeler “Başvuruyu Gönder” adımında özel bir depolama alanına yüklenir. Bu alan herkese açık değildir; belgelerini
          yalnızca sen ve başvurunu inceleyen yetkili yönetici görüntüleyebilir.
        </p>
      ) : (
        <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Bu ekrandaki belgeler yalnızca bu oturumda tarayıcınızda tutulur; gerçek
          bir sunucuya yüklenmez. Başvurunuz alındıktan sonra ekibimiz belgelerin
          gerçek yüklemesi için sizinle iletişime geçecektir.
        </p>
      )}
    </StepShell>
  );
}
