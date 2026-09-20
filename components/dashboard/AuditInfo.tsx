import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

/** Kayıt geçmişi bilgisi: kim, ne zaman oluşturdu / güncelledi. Bilinmeyen alan gösterilmez. */
export function AuditInfo({
  createdAt,
  updatedAt,
  actor,
  className,
}: {
  createdAt?: string;
  updatedAt?: string;
  actor?: string;
  className?: string;
}) {
  const parts = [
    createdAt ? `Oluşturulma: ${formatDateTime(createdAt)}` : null,
    updatedAt ? `Son güncelleme: ${formatDateTime(updatedAt)}` : null,
    actor ? `İşlemi yapan: ${actor}` : null,
  ].filter((part): part is string => part !== null);
  if (!parts.length) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-[11px] leading-relaxed text-muted", className)}>
      <History size={12} aria-hidden className="mt-0.5 shrink-0" />
      <span>{parts.join(" · ")}</span>
    </p>
  );
}
