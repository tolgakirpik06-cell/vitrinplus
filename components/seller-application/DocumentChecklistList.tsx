"use client";

import { useState, type ReactNode } from "react";
import { FileCheck2, FileText } from "lucide-react";
import { ActionButton } from "@/components/dashboard/form";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { friendlyError } from "@/lib/domain/errors";
import { formatFileSize, type DocumentChecklistItem } from "@/lib/domain/seller-documents";

type GetUrl = (documentId: string, mode: "view" | "download") => Promise<string>;

/**
 * "Görüntüle" / "İndir" düğmeleri. Belge herkese açık bir adreste durmaz: her tıklamada kısa ömürlü (60 sn) imzalı adres
 * istenir. İstek yetkisizse (ör. başka satıcının belgesi) depolama politikası reddeder ve burada anlaşılır bir hata görünür.
 */
export function DocumentActions({ documentId, label, getUrl }: { documentId: string; label: string; getUrl: GetUrl }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState("");

  async function open(mode: "view" | "download") {
    setError("");
    // Görüntüleme yeni sekmede açılır; sekme, tıklama anında (asenkron istekten önce) açılır ki açılır pencere engelleyicisi karışmasın.
    const tab = mode === "view" ? window.open("about:blank", "_blank") : null;
    if (mode === "view" && !tab) {
      setError("Açılır pencere engellendi. Tarayıcında bu site için açılır pencerelere izin ver.");
      return;
    }
    setBusy(mode);
    try {
      const url = await getUrl(documentId, mode);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch (caught) {
      tab?.close();
      setError(friendlyError(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex gap-2">
        <ActionButton size="sm" variant="secondary" loading={busy === "view"} disabled={busy !== null} onClick={() => void open("view")} aria-label={`${label} belgesini görüntüle`}>Görüntüle</ActionButton>
        <ActionButton size="sm" variant="secondary" loading={busy === "download"} disabled={busy !== null} onClick={() => void open("download")} aria-label={`${label} belgesini indir`}>İndir</ActionButton>
      </div>
      {error && <p role="alert" className="max-w-xs text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/** Belge kontrol listesi: her zorunlu belge için ad, yükleme durumu ve (yüklendiyse) Görüntüle / İndir. Yüklenmemiş belge asla varmış gibi gösterilmez. */
export function DocumentChecklistList({ items, getUrl, renderExtra }: { items: DocumentChecklistItem[]; getUrl: GetUrl; renderExtra?: (item: DocumentChecklistItem) => ReactNode }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.document ? "bg-emerald-50 text-emerald-600" : "bg-navy-50 text-navy-300"}`} aria-hidden>
              {item.document ? <FileCheck2 size={18} /> : <FileText size={18} />}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-900">
                {item.label}
                <StatusBadge tone={item.document ? "success" : item.required ? "danger" : "neutral"}>{item.document ? "Yüklendi" : "Yüklenmedi"}</StatusBadge>
                {!item.required && <span className="text-[11px] font-medium text-muted">isteğe bağlı</span>}
              </p>
              {item.document ? (
                <p className="mt-0.5 break-words text-xs text-muted">
                  {item.document.name} · {formatFileSize(item.document.sizeBytes)} · {new Date(item.document.uploadedAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">{item.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {item.document && <DocumentActions documentId={item.document.id} label={item.label} getUrl={getUrl} />}
            {renderExtra?.(item)}
          </div>
        </li>
      ))}
    </ul>
  );
}
