"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileCheck2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedDocMeta } from "@/types/seller-application";

const ACCEPTED_TYPES = [".pdf", ".jpg", ".jpeg", ".png"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  id,
  label,
  description,
  value,
  onChange,
  error,
  required,
  validateFile,
  selectedLabel = "yüklendi",
}: {
  id: string;
  label: string;
  description?: string;
  value: UploadedDocMeta | null | undefined;
  /** Seçilen dosya (meta + dosyanın kendisi) ya da kaldırıldığında `null, null`. Dosya içeriği hiçbir yerde saklanmaz; gönderimde özel depolamaya yüklenir. */
  onChange: (meta: UploadedDocMeta | null, file: File | null) => void;
  error?: string;
  required?: boolean;
  /** Gerçek yükleme modunda tür/boyut kontrolü: hata metni döndürürse dosya kabul edilmez. */
  validateFile?: (file: File) => string | null;
  /** Dosya seçildikten sonra gösterilen durum metni. */
  selectedLabel?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateFile?.(file) ?? null;
    if (problem) {
      setLocalError(problem);
      return;
    }
    setLocalError("");
    onChange(
      {
        name: file.name,
        size: file.size,
        type: file.type || "bilinmiyor",
        uploadedAt: new Date().toISOString(),
      },
      file
    );
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-navy-800">
        {label}
        {required ? <span className="ml-0.5 text-brand-500">*</span> : null}
      </p>
      {description ? <p className="-mt-1 text-xs text-navy-400">{description}</p> : null}

      {value ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-emerald-50/60 p-3.5",
            error ? "border-rose-300" : "border-emerald-200"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <FileCheck2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-800">{value.name}</p>
            <p className="text-xs text-navy-400">{formatSize(value.size)} — {selectedLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalError("");
              onChange(null, null);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-navy-400 transition-colors hover:bg-white hover:text-rose-500"
            aria-label={`${label} dosyasını kaldır`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            isDragging
              ? "border-brand-400 bg-brand-50/60"
              : error
                ? "border-rose-300 bg-rose-50/30"
                : "border-navy-200 bg-navy-50/40 hover:border-brand-300 hover:bg-brand-50/30"
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-400 shadow-sm">
            <UploadCloud size={18} />
          </span>
          <p className="text-xs font-medium text-navy-600">
            Dosyayı sürükleyip bırakın veya{" "}
            <span className="font-semibold text-brand-600">seçmek için tıklayın</span>
          </p>
          <p className="text-[11px] text-navy-400">PDF, JPG veya PNG — maks. 10 MB</p>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
      {localError || error ? <p role="alert" className="text-xs font-medium text-rose-600">{localError || error}</p> : null}
    </div>
  );
}
