"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DEFAULT_PLAN_KEY, isPlanKey } from "@/lib/plans";
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
import type { SellerApplicationData, SellerDocumentKey } from "@/types/seller-application";
import type { SellerDocumentFiles } from "@/lib/repositories/types";
import { requiredDocumentKeys } from "@/lib/domain/seller-documents";

type StepConfig = {
  id: string;
  label: string;
  validate: (data: SellerApplicationData) => FieldErrors;
  render: (props: {
    data: SellerApplicationData;
    errors: FieldErrors;
    setData: Dispatch<SetStateAction<SellerApplicationData>>;
    /** Gerçek hesap modu: şifre alınmaz, e-posta oturumdaki hesaptan gelir. */
    live: boolean;
    accountEmail?: string;
    /** Gerçek modda seçilen belge dosyasını (yalnızca bellekte) saklar; gönderimde özel depolamaya yüklenir. */
    setFile: (key: SellerDocumentKey, file: File | null) => void;
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
  const live = demo.mode === "supabase";
  const [data, setData] = useState<SellerApplicationData>(initialSellerApplicationData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Seçilen dosyaların kendisi yalnızca bellekte tutulur (taslağa/localStorage'a yazılmaz).
  const [files, setFiles] = useState<SellerDocumentFiles>({});
  const setFile = useCallback((key: SellerDocumentKey, file: File | null) => {
    setFiles((previous) => {
      const next = { ...previous };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }, []);

  // Taslağı localStorage'dan yükle (sadece ilk render'da, tarayıcıda).
  useEffect(() => {
    try {
      // Eski "pazarbuy:" taslağı varsa yeni anahtara taşınır.
      const raw = readWithMigration(SELLER_DRAFT_STORAGE_KEY, LEGACY_SELLER_DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SellerApplicationData;
        if (parsed && typeof parsed === "object" && parsed.status === "taslak") {
          // Taslak sadece hydration tamamlandıktan sonra uygulanabilir.
          const restored = normalizeApplicationData({ ...initialSellerApplicationData, ...parsed });
          // Gerçek modda dosyanın kendisi taslakta yoktur: belgeler yeniden seçilir (yalnızca eski dosya bilgisi kalmasın).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setData(live ? { ...restored, documents: {} } : restored);
        }
      }
    } catch {
      // Bozuk taslak verisi sessizce yok sayılır.
    } finally {
      setHydrated(true);
    }
  }, [live]);

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

  /** Gerçek modda e-posta oturumdaki hesaptır; şifre bu forma ait değildir (kimlik sağlayıcıda tutulur). */
  const effective: SellerApplicationData = live && demo.user ? { ...data, account: { ...data.account, email: demo.user.email } } : data;

  /** Yalnızca seçilen satıcı tipinin istediği belgeler yüklenir (tip değişince kalan eski seçimler gönderilmez). */
  function filesForSubmit(): SellerDocumentFiles {
    const picked: SellerDocumentFiles = {};
    for (const key of requiredDocumentKeys(effective.sellerType)) {
      const file = files[key];
      if (file) picked[key] = file;
    }
    return picked;
  }

  function handleNext() {
    const stepErrors = { ...currentStep.validate(effective) };
    if (live) {
      delete stepErrors.sifre;
      delete stepErrors.sifreTekrar;
      // Gerçek modda belge, dosyanın kendisiyle birlikte seçilmiş olmalı (yalnızca dosya bilgisi yetmez).
      if (currentStep.id === "belgeler") {
        for (const key of requiredDocumentKeys(effective.sellerType)) {
          if (effective.documents[key] && !files[key]) stepErrors[key] = "Dosya bu oturumda bulunamadı. Lütfen belgeyi yeniden seçin.";
        }
      }
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Son adım — başvuruyu gönder. Demo modunda tarayıcıya, gerçek hesap modunda veritabanına kaydedilir.
    setSubmitting(true);
    const plan = isPlanKey(data.planId) ? data.planId : DEFAULT_PLAN_KEY;
    void demo
      .submitSellerApplication({ storeName: data.store.magazaAdi, description: data.store.aciklama, plan, application: effective, documents: live ? filesForSubmit() : undefined })
      .then((applicationId) => {
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
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((error: unknown) => setErrors({ submit: error instanceof Error ? error.message : "Başvuru gönderilemedi." }))
      .finally(() => setSubmitting(false));
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
        <SellerSuccess applicationId={data.applicationId ?? ""} status={data.status} live={live} />
      </div>
    );
  }

  // Gerçek hesap modunda başvuru bir hesaba bağlıdır: önce giriş yapılmalı.
  if (live && !demo.ready) return <p className="text-center text-sm text-navy-400">Yükleniyor…</p>;
  if (live && !demo.user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-navy-100/80 bg-white p-8 text-center shadow-card">
        <h2 className="text-xl font-extrabold text-navy-900">Başvuru için giriş yap</h2>
        <p className="mt-2 text-sm text-navy-500">Satıcı başvurun hesabına bağlı olarak kaydedilir ve durumunu daha sonra buradan takip edersin.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/giris?next=%2Fsatici-basvuru" className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white">Giriş yap</Link>
          <Link href="/kayit?next=%2Fsatici-basvuru" className="rounded-full border border-navy-100 px-6 py-2.5 text-sm font-semibold text-navy-700">Üye ol</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-navy-100/80 bg-white p-5 shadow-card sm:p-8">
        {live ? (
          <div className="mb-6 rounded-xl bg-brand-50 p-4 text-sm">Başvurun hesabına kaydedilir ve yönetici tarafından incelenir. Şifre, TC kimlik no, doğum tarihi ve tam IBAN sunucuya gönderilmez. Belgelerin özel bir depolama alanına yüklenir; herkese açık bağlantısı yoktur, yalnızca sen ve yetkili yönetici görüntüleyebilir.</div>
        ) : (
          <div className="mb-6 rounded-xl bg-brand-50 p-4 text-sm">Bu ayrıntılı form demo önizlemesidir. Gerçek belge veya kişisel bilgi girme. <Link href="/demo" className="font-bold text-brand-600 underline">Hızlı demo başvurusu yap</Link></div>
        )}
        {errors.submit && <p role="alert" className="mb-4 text-rose-600">{errors.submit}</p>}
        <Stepper steps={stepperItems} currentIndex={currentIndex} />

        <div className="mt-7 sm:mt-8">
          {currentStep.render({ data: effective, errors, setData, live, accountEmail: demo.user?.email, setFile })}
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
