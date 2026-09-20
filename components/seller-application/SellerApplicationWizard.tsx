"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Stepper } from "@/components/seller-application/Stepper";
import { SellerTypeStep } from "@/components/seller-application/steps/SellerTypeStep";
import { SellerAccountStep } from "@/components/seller-application/steps/SellerAccountStep";
import { SellerBusinessStep } from "@/components/seller-application/steps/SellerBusinessStep";
import { SellerBankStep } from "@/components/seller-application/steps/SellerBankStep";
import { SellerDocumentsStep } from "@/components/seller-application/steps/SellerDocumentsStep";
import { SellerStoreStep } from "@/components/seller-application/steps/SellerStoreStep";
import { SellerInvoiceStep } from "@/components/seller-application/steps/SellerInvoiceStep";
import { SellerPlanStep } from "@/components/seller-application/steps/SellerPlanStep";
import { SellerAgreementStep } from "@/components/seller-application/steps/SellerAgreementStep";
import { SellerSuccess } from "@/components/seller-application/steps/SellerSuccess";
import {
  LEGACY_SELLER_DRAFT_STORAGE_KEY,
  LEGACY_SELLER_SUBMITTED_STORAGE_KEY,
  SELLER_DRAFT_STORAGE_KEY,
  SELLER_SUBMITTED_STORAGE_KEY,
  normalizeApplicationData,
} from "@/lib/seller-application";
import { readWithMigration, removeWithLegacy } from "@/lib/storage-migration";
import { setOwnerPlan } from "@/lib/seller-ops";
import {
  validateAccount,
  validateAgreement,
  validateBank,
  validateBusiness,
  validateDocuments,
  validateInvoice,
  validatePlan,
  validateSellerType,
  validateStore,
  type FieldErrors,
} from "@/lib/seller-application-validation";
import { useDemo } from "@/components/demo/DemoProvider";
import Link from "next/link";
import { initialSellerApplicationData } from "@/types/seller-application";
import type { SellerApplicationData } from "@/types/seller-application";

type StepConfig = {
  id: string;
  label: string;
  validate: (data: SellerApplicationData) => FieldErrors;
  render: (props: {
    data: SellerApplicationData;
    errors: FieldErrors;
    setData: Dispatch<SetStateAction<SellerApplicationData>>;
  }) => ReactNode;
};

const steps: StepConfig[] = [
  {
    id: "tip",
    label: "Satıcı Tipi",
    validate: validateSellerType,
    render: (props) => <SellerTypeStep {...props} />,
  },
  {
    id: "hesap",
    label: "Hesap Bilgileri",
    validate: validateAccount,
    render: (props) => <SellerAccountStep {...props} />,
  },
  {
    id: "isletme",
    label: "İşletme Bilgileri",
    validate: validateBusiness,
    render: (props) => <SellerBusinessStep {...props} />,
  },
  {
    id: "odeme",
    label: "Ödeme Bilgileri",
    validate: validateBank,
    render: (props) => <SellerBankStep {...props} />,
  },
  {
    id: "belgeler",
    label: "Belgeler",
    validate: validateDocuments,
    render: (props) => <SellerDocumentsStep {...props} />,
  },
  {
    id: "magaza",
    label: "Mağaza Bilgileri",
    validate: validateStore,
    render: (props) => <SellerStoreStep {...props} />,
  },
  {
    id: "fatura",
    label: "Fatura Bilgileri",
    validate: validateInvoice,
    render: (props) => <SellerInvoiceStep {...props} />,
  },
  {
    id: "paket",
    label: "Mağaza Paketi",
    validate: validatePlan,
    render: (props) => <SellerPlanStep {...props} />,
  },
  {
    id: "sozlesme",
    label: "Sözleşme",
    validate: validateAgreement,
    render: (props) => <SellerAgreementStep {...props} />,
  },
];

export function SellerApplicationWizard() {
  const demo = useDemo();
  const [data, setData] = useState<SellerApplicationData>(initialSellerApplicationData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Taslağı localStorage'dan yükle (sadece ilk render'da, tarayıcıda).
  useEffect(() => {
    try {
      // Eski "pazarbuy:" taslağı varsa yeni anahtara taşınır.
      const raw = readWithMigration(SELLER_DRAFT_STORAGE_KEY, LEGACY_SELLER_DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SellerApplicationData;
        if (parsed && typeof parsed === "object" && parsed.status === "taslak") {
          // Taslak sadece hydration tamamlandıktan sonra uygulanabilir.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setData(normalizeApplicationData({ ...initialSellerApplicationData, ...parsed }));
        }
      }
    } catch {
      // Bozuk taslak verisi sessizce yok sayılır.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Taslağı her değişiklikte kaydet — sadece henüz gönderilmemişse.
  useEffect(() => {
    if (!hydrated || data.status !== "taslak") return;
    try {
      window.localStorage.setItem(SELLER_DRAFT_STORAGE_KEY, JSON.stringify({ ...data, account: { ...data.account, sifre: "", sifreTekrar: "", tcKimlikNo: "", dogumTarihi: "" }, bank: initialSellerApplicationData.bank }));
    } catch {
      // localStorage dolu/erişilemez olabilir — taslak kaydı best-effort'tur.
    }
  }, [data, hydrated]);

  const currentStep = steps[currentIndex];
  const isSuccess = data.status !== "taslak";

  const stepperItems = useMemo(
    () => steps.map((step) => ({ id: step.id, label: step.label })),
    []
  );

  function handleNext() {
    const stepErrors = currentStep.validate(data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Son adım — başvuruyu gönder.
    setSubmitting(true);
    let applicationId: string;
    try { applicationId = demo.apply(data.store.magazaAdi, data.store.aciklama); if (demo.user && data.planId) setOwnerPlan(demo.user.id, data.planId); } catch (e) { setErrors({ submit: (e as Error).message }); setSubmitting(false); return; }
    window.setTimeout(() => {
      setData((prev) => ({ ...prev, status: "bekliyor", applicationId }));
      try {
        removeWithLegacy(SELLER_DRAFT_STORAGE_KEY, LEGACY_SELLER_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_SELLER_SUBMITTED_STORAGE_KEY);
        window.localStorage.setItem(
          SELLER_SUBMITTED_STORAGE_KEY,
          JSON.stringify({
            reference: applicationId,
            accessToken: "demo",
            status: "bekliyor",
            magazaAdi: data.store.magazaAdi,
            submittedAt: new Date().toISOString(),
          })
        );
      } catch {
        // best-effort
      }
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 600);
  }

  function handleBack() {
    if (currentIndex === 0) return;
    setErrors({});
    setCurrentIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-navy-100/80 bg-white p-6 shadow-card sm:p-10">
        <SellerSuccess applicationId={data.applicationId ?? ""} status={data.status} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-navy-100/80 bg-white p-5 shadow-card sm:p-8">
        <div className="mb-6 rounded-xl bg-brand-50 p-4 text-sm">Bu ayrıntılı form demo önizlemesidir. Gerçek belge veya kişisel bilgi girme. <Link href="/demo" className="font-bold text-brand-600 underline">Hızlı demo başvurusu yap</Link></div>
        {errors.submit && <p role="alert" className="mb-4 text-rose-600">{errors.submit}</p>}
        <Stepper steps={stepperItems} currentIndex={currentIndex} />

        <div className="mt-7 sm:mt-8">
          {currentStep.render({ data, errors, setData })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy-100 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-100 px-5 py-2.5 text-sm font-semibold text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft size={15} />
            Geri
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.55)] transition-colors hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Gönderiliyor…
              </>
            ) : currentIndex === steps.length - 1 ? (
              "Başvuruyu Gönder"
            ) : (
              <>
                İleri
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
