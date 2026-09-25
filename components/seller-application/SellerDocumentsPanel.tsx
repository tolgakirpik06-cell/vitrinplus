"use client";

import { useCallback, useRef, useState } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { DocumentChecklistList } from "@/components/seller-application/DocumentChecklistList";
import { ActionButton } from "@/components/dashboard/form";
import { buildDocumentChecklist, validateSellerDocument, type DocumentChecklistItem } from "@/lib/domain/seller-documents";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import type { DbSellerStatus } from "@/types/database";

function UploadButton({ item, busy, disabled, onPick }: { item: DocumentChecklistItem; busy: boolean; disabled: boolean; onPick: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <ActionButton size="sm" variant={item.document ? "secondary" : "primary"} loading={busy} disabled={disabled} onClick={() => input.current?.click()} aria-label={`${item.label} için dosya seç`}>
        {item.document ? "Değiştir" : "Dosya yükle"}
      </ActionButton>
      <input
        ref={input}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // Aynı dosya tekrar seçilebilsin.
          if (file) onPick(file);
        }}
      />
    </>
  );
}

/**
 * Satıcının kendi belgeleri (yalnızca kendi klasörü; RLS + depolama politikası). Başvuru İNCELENİRKEN eksik belge yüklenebilir
 * ya da değiştirilebilir; karar verildikten sonra liste salt okunurdur.
 */
export function SellerDocumentsPanel({ sellerType, status }: { sellerType: string | null; status: DbSellerStatus }) {
  const { services } = useMarketplace();
  const documents = services.sellerDocuments;
  const load = useCallback(() => (documents ? documents.list() : Promise.resolve([])), [documents]);
  const list = useAsync(load);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  if (!documents) return null;

  const canUpload = status === "pending";
  const checklist = buildDocumentChecklist(sellerType, list.data ?? []);

  async function pick(item: DocumentChecklistItem, file: File) {
    if (!documents) return;
    setMessage(null);
    setBusyKey(item.key);
    try {
      validateSellerDocument({ type: file.type, size: file.size });
      await documents.upload({ [item.key]: file });
      setMessage({ tone: "ok", text: `${item.label} yüklendi.` });
      list.reload();
    } catch (caught) {
      setMessage({ tone: "error", text: friendlyError(caught) });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section aria-labelledby="documents-title" className="space-y-3">
      <div>
        <h2 id="documents-title" className="text-base font-bold text-navy-900">Belgelerin</h2>
        <p className="mt-1 text-xs text-muted">Belgelerin özel bir depolama alanında tutulur; yalnızca sen ve başvurunu inceleyen yönetici görüntüleyebilir. PDF, JPG veya PNG, en fazla 10 MB.</p>
      </div>
      {list.error ? (
        <p role="alert" className="text-sm text-rose-600">Belgeler yüklenemedi. {list.error} <button type="button" onClick={list.reload} className="font-semibold text-brand-600 underline">Tekrar dene</button></p>
      ) : list.loading && !list.data ? (
        <p role="status" className="text-sm text-navy-500">Belgeler yükleniyor…</p>
      ) : (
        <>
          {canUpload && !checklist.complete && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Eksik belge: {checklist.missingLabels.join(", ")}. Başvurun incelenirken bu belgeleri buradan yükleyebilirsin.</p>
          )}
          <DocumentChecklistList
            items={checklist.items}
            getUrl={(id, mode) => documents.getUrl(id, mode)}
            renderExtra={canUpload ? (item) => <UploadButton item={item} busy={busyKey === item.key} disabled={busyKey !== null} onPick={(file) => void pick(item, file)} /> : undefined}
          />
          {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p>}
        </>
      )}
    </section>
  );
}
