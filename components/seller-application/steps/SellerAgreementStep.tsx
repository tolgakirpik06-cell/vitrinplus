"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { X } from "lucide-react";
import { StepShell } from "@/components/seller-application/StepShell";
import { CheckboxRow } from "@/components/seller-application/fields";
import type { SellerApplicationData } from "@/types/seller-application";
import type { FieldErrors } from "@/lib/seller-application-validation";

const agreementCopy = {
  sozlesme: {
    title: "VitrinPlus Satıcı Sözleşmesi",
    body: [
      "Bu sözleşme, VitrinPlus pazaryerinde mağaza açan satıcılar ile VitrinPlus arasındaki hak ve yükümlülükleri düzenler.",
      "Satıcı, sattığı ürünlerin mevzuata uygunluğundan, ürün açıklamalarının doğruluğundan ve sipariş süreçlerinin zamanında yönetilmesinden sorumludur.",
      "VitrinPlus, satış komisyonu almaz; satıcıdan yalnızca seçilen pakete göre sabit bir aylık mağaza ücreti tahsil eder.",
      "Bu metin bir taslak/demo sözleşme örneğidir; gerçek hukuki metin VitrinPlus hukuk ekibi tarafından yayınlanacaktır.",
    ],
  },
  kvkk: {
    title: "KVKK / Gizlilik Metni",
    body: [
      "Başvuru sırasında paylaştığınız kimlik, iletişim, vergi ve banka bilgileri, satıcı başvurunuzun değerlendirilmesi amacıyla işlenir.",
      "Bilgileriniz, yalnızca mağaza açma ve doğrulama süreçleri için gerekli süre boyunca saklanır ve üçüncü taraflarla yalnızca yasal zorunluluklar çerçevesinde paylaşılır.",
      "Bu metin bir taslak/demo aydınlatma metnidir; gerçek KVKK metni VitrinPlus hukuk ekibi tarafından yayınlanacaktır.",
    ],
  },
};

function AgreementModal({
  type,
  onClose,
}: {
  type: "sozlesme" | "kvkk";
  onClose: () => void;
}) {
  const content = agreementCopy[type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h3 className="text-sm font-bold text-navy-900">{content.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {content.body.map((paragraph, index) => (
            <p key={index} className="mb-3 text-xs leading-relaxed text-navy-500 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SellerAgreementStep({
  data,
  errors,
  setData,
}: {
  data: SellerApplicationData;
  errors: FieldErrors;
  setData: Dispatch<SetStateAction<SellerApplicationData>>;
}) {
  const [openModal, setOpenModal] = useState<"sozlesme" | "kvkk" | null>(null);
  const { agreement } = data;

  function update<K extends keyof typeof agreement>(key: K, value: (typeof agreement)[K]) {
    setData((prev) => ({ ...prev, agreement: { ...prev.agreement, [key]: value } }));
  }

  return (
    <StepShell title="Sözleşme ve Onaylar" subtitle="Başvurunuzu tamamlamak için son adım.">
      <div className="flex flex-col gap-3">
        <CheckboxRow
          id="sozlesmeKabul"
          required
          checked={agreement.sozlesmeKabul}
          onChange={(checked) => update("sozlesmeKabul", checked)}
          error={errors.sozlesmeKabul}
          label={
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenModal("sozlesme");
                }}
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                Satıcı sözleşmesini
              </button>{" "}
              okudum ve kabul ediyorum.
            </>
          }
        />
        <CheckboxRow
          id="kvkkKabul"
          required
          checked={agreement.kvkkKabul}
          onChange={(checked) => update("kvkkKabul", checked)}
          error={errors.kvkkKabul}
          label={
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenModal("kvkk");
                }}
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                KVKK / gizlilik metnini
              </button>{" "}
              okudum.
            </>
          }
        />

        <div className="my-1 h-px bg-navy-100" aria-hidden />

        <CheckboxRow
          id="ticariIletiKabul"
          checked={agreement.ticariIletiKabul}
          onChange={(checked) => update("ticariIletiKabul", checked)}
          label="Kampanya ve fırsatlarla ilgili tarafıma ticari elektronik ileti gönderilmesini istiyorum. (İsteğe bağlı)"
        />
      </div>

      {openModal ? <AgreementModal type={openModal} onClose={() => setOpenModal(null)} /> : null}
    </StepShell>
  );
}
