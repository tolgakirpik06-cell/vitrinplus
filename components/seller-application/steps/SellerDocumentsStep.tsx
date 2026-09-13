"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { FileDropzone } from "@/components/seller-application/FileDropzone";
import { sellerDocumentConfig } from "@/lib/seller-application";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

export function SellerDocumentsStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const sellerType = data.sellerType;
  const visibleDocs = sellerDocumentConfig.filter(
    (doc) => !sellerType || doc.sellerTypes.includes(sellerType)
  );

  return (
    <StepShell
      title="Belgeler"
      subtitle="Satıcı tipinize göre istenen belgeleri yükleyin. Kabul edilen formatlar: PDF, JPG, PNG."
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
            onChange={(meta) =>
              setData((prev) => ({
                ...prev,
                documents: { ...prev.documents, [doc.key]: meta ?? undefined },
              }))
            }
          />
        ))}
      </div>

      <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        Bu ekrandaki belgeler yalnızca bu oturumda tarayıcınızda tutulur; gerçek
        bir sunucuya yüklenmez. Başvurunuz alındıktan sonra ekibimiz belgelerin
        gerçek yüklemesi için sizinle iletişime geçecektir.
      </p>
    </StepShell>
  );
}
