"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";

/**
 * Satıcı değişikliklerinin sunucuya yazılma durumu (yalnızca gerçek hesap modunda görünür).
 * Hata olduğunda sessizce yutulmaz: kullanıcı yeniden dener ya da değişiklikleri bırakıp sunucudaki duruma döner.
 */
export function SyncStatusBar() {
  const { mode, sync, retrySync, discardUnsynced } = useDemo();
  if (mode !== "supabase" || sync.status === "idle") return null;

  if (sync.status === "syncing") {
    return (
      <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-700 shadow-lg">
        <Loader2 size={16} className="shrink-0 animate-spin text-brand-500" aria-hidden />
        <span>Değişikliklerin kaydediliyor{sync.pending > 1 ? ` (${sync.pending} işlem)` : ""}…</span>
      </div>
    );
  }

  return (
    <div role="alert" className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-rose-200 bg-white p-4 text-sm shadow-lg">
      <p className="flex items-start gap-2 font-semibold text-rose-700">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
        Değişiklikler kaydedilemedi
      </p>
      <p className="mt-1 text-navy-600">{sync.error}</p>
      <p className="mt-1 text-xs text-navy-400">Sayfayı kapatma: kaydedilmeyen değişiklikler kaybolabilir.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={retrySync} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
          Tekrar dene
        </button>
        <button type="button" onClick={discardUnsynced} className="rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50">
          Vazgeç ve geri al
        </button>
      </div>
    </div>
  );
}
