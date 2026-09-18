"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardX, Store } from "lucide-react";
import { SELLER_SUBMITTED_STORAGE_KEY } from "@/lib/seller-application";
import { applicationStatusLabels } from "@/types/seller-application";
import type { SubmittedApplicationSummary } from "@/lib/seller-application";

export function ApplicationStatusClient() {
  const [summary, setSummary] = useState<SubmittedApplicationSummary | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SELLER_SUBMITTED_STORAGE_KEY);
      // Bu değer yalnızca tarayıcıdaki başvuru özetinden okunabilir.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummary(raw ? (JSON.parse(raw) as SubmittedApplicationSummary) : null);
    } catch {
      setSummary(null);
    }
  }, []);

  if (summary === undefined) return null;

  if (!summary) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-navy-100/80 bg-white p-8 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-400">
          <ClipboardX size={26} />
        </span>
        <h1 className="text-lg font-extrabold text-navy-900">Görüntülenecek Başvuru Bulunamadı</h1>
        <p className="text-sm text-navy-400">
          Bu tarayıcıda kayıtlı bir satıcı başvurunuz görünmüyor.
        </p>
        <Link
          href="/satici-basvuru"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Store size={16} />
          Satıcı Başvurusu Yap
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-navy-100/80 bg-white p-8 text-center shadow-card">
      <h1 className="text-lg font-extrabold text-navy-900">Başvuru Durumu</h1>
      <div className="flex w-full flex-col gap-3 rounded-2xl border border-navy-100 bg-navy-50/50 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-navy-400">Başvuru No</span>
          <span className="font-bold text-navy-900">{summary.applicationId}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-navy-400">Mağaza Adı</span>
          <span className="font-semibold text-navy-800">{summary.magazaAdi || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-navy-400">Durum</span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {applicationStatusLabels[summary.status]}
          </span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-navy-400">
        Başvurunuz ekibimiz tarafından inceleniyor. Durumu güncellendiğinde
        bilgilendirileceksiniz.
      </p>
      <Link href="/" className="text-xs font-semibold text-brand-600 hover:underline">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
