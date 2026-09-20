"use client";

import { CheckCircle2, Download, FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { useState, type DragEvent } from "react";
import { Modal } from "@/components/dashboard/Modal";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton } from "@/components/dashboard/form";
import { cn } from "@/lib/utils";
import { downloadTextFile, parseCsv, toCsv } from "@/lib/csv";
import { hasFeature, productCapacity } from "@/lib/plans";
import { IMPORT_TEMPLATE, validateImport, type ImportResult } from "@/lib/product-import";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function UploadBody({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { planKey, products, ops } = useSellerWorkspace();
  const { addProducts } = useSellerData();
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const capacity = productCapacity(planKey, products.length, ops.capacityRequest);

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return void toast.error("Dosya 10 MB'dan büyük.");
    if (!/\.(csv|txt)$/i.test(file.name)) return void toast.error("Şimdilik yalnızca CSV dosyası yüklenebilir. Excel dosyanı CSV olarak kaydet (Farklı Kaydet → CSV).");
    try {
      const text = await file.text();
      setFileName(file.name);
      setResult(validateImport(parseCsv(text), products.map((product) => product.sku), capacity.remaining));
    } catch {
      toast.error("Dosya okunamadı.");
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  function runImport() {
    if (!result || result.products.length === 0) return;
    setImporting(true);
    try {
      addProducts(result.products);
      toast.success(`${result.products.length} ürün mağazana eklendi.`);
      onClose();
    } catch (error) {
      setImporting(false);
      toast.error(error instanceof Error ? error.message : "Ürünler içe aktarılamadı.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Toplu Ürün Yükleme"
      description="CSV dosyanla yüzlerce ürünü tek seferde ekle. Excel kullanıyorsan dosyayı CSV olarak kaydet."
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Vazgeç
          </ActionButton>
          <ActionButton variant="primary" disabled={!result || result.products.length === 0} loading={importing} onClick={runImport}>
            {result && result.products.length > 0 ? `${result.products.length} Ürünü İçe Aktar` : "İçe Aktar"}
          </ActionButton>
        </>
      }
    >
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:outline-2 focus-within:outline-royal-500",
          dragging ? "border-royal-400 bg-royal-50" : "border-royal-200 bg-royal-50/30 hover:bg-royal-50/60"
        )}
      >
        <UploadCloud size={30} aria-hidden className="text-royal-500" />
        <span className="text-[13px] text-navy-700">
          Dosyayı sürükleyip bırak veya <span className="font-bold text-royal-600 underline">seç</span>
        </span>
        <span className="text-xs text-muted">CSV (Maks. 10 MB, en fazla 1.000 satır)</span>
        <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(event) => void readFile(event.target.files?.[0])} aria-label="CSV dosyası seç" />
      </label>

      <button
        type="button"
        onClick={() => downloadTextFile("vitrinplus-urun-sablonu.csv", toCsv(IMPORT_TEMPLATE))}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-royal-600 hover:text-royal-800 focus-visible:outline-2 focus-visible:outline-royal-500"
      >
        <Download size={13} aria-hidden /> Örnek CSV şablonunu indir
      </button>

      {result ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-navy-800">
            <FileSpreadsheet size={16} aria-hidden className="text-navy-400" /> {fileName}
          </p>
          {result.headerError ? (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {result.headerError} Şablondaki sütun adlarını kullan.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  <CheckCircle2 size={13} aria-hidden /> {result.products.length} ürün hazır
                </span>
                {result.errors.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                    <XCircle size={13} aria-hidden /> {result.errors.length} satırda sorun var
                  </span>
                ) : null}
              </div>
              {result.errors.length > 0 ? (
                <ul className="max-h-36 overflow-y-auto rounded-lg border border-line text-xs">
                  {result.errors.slice(0, 50).map((error) => (
                    <li key={`${error.row}-${error.message}`} className="flex gap-2 border-b border-line/70 px-3 py-1.5 last:border-b-0">
                      <span className="font-bold tabular-nums text-navy-700">Satır {error.row}</span>
                      <span className="text-muted">{error.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.products.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[420px] text-xs">
                    <caption className="sr-only">İçe aktarılacak ürünlerin önizlemesi</caption>
                    <thead className="bg-navy-50/70 text-left text-muted">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">Ürün</th>
                        <th scope="col" className="px-3 py-2 font-semibold">SKU</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Fiyat</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {result.products.slice(0, 5).map((product) => (
                        <tr key={product.sku}>
                          <td className="max-w-[200px] truncate px-3 py-1.5 font-medium text-navy-800">{product.name}</td>
                          <td className="px-3 py-1.5 text-navy-600">{product.sku}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{product.price.toLocaleString("tr-TR")} TL</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{product.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.products.length > 5 ? <p className="border-t border-line px-3 py-1.5 text-[11px] text-muted">… ve {result.products.length - 5} ürün daha</p> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

/** Toplu ürün yükleme penceresi. Vitrin Paket'te kilitlidir; kilit boş sayfa değil, yükseltme yolu gösterir. */
export function BulkUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { planKey } = useSellerWorkspace();
  if (!open) return null;
  if (!hasFeature(planKey, "csvImport")) {
    return (
      <Modal open onClose={onClose} title="Toplu Ürün Yükleme" description="Excel/CSV ile toplu ürün yükleme özelliği">
        <UpgradeLock feature="csvImport" currentPlan={planKey} variant="card" />
      </Modal>
    );
  }
  return <UploadBody onClose={onClose} />;
}
