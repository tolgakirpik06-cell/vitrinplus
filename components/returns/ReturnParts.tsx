import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { returnReasonLabels, returnStatusLabels } from "@/lib/domain/returns";
import type { ReturnView } from "@/lib/repositories/types";
import type { DbReturnStatus } from "@/types/database";
import { formatPrice } from "@/lib/utils";

const TONES: Record<DbReturnStatus, BadgeTone> = { requested: "warning", approved: "info", rejected: "danger", shipped: "info", received: "brand", refunded: "success" };

export function ReturnStatusBadge({ status }: { status: DbReturnStatus }) {
  return <StatusBadge tone={TONES[status]}>{returnStatusLabels[status]}</StatusBadge>;
}

const ACTOR_LABEL = { buyer: "Müşteri", seller: "Satıcı", admin: "Yönetici", system: "Sistem" } as const;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** İade kaydının gerçek olay geçmişi (kim, ne zaman, hangi duruma aldı). */
export function ReturnTimeline({ events }: { events: ReturnView["events"] }) {
  if (!events.length) return null;
  return (
    <ol aria-label="İade geçmişi" className="mt-3 space-y-1.5 border-l-2 border-navy-100 pl-3 text-xs text-navy-600">
      {events.map((event) => (
        <li key={event.id}>
          <span className="font-semibold text-navy-800">{returnStatusLabels[event.toStatus]}</span> · {ACTOR_LABEL[event.actorRole]} · {formatWhen(event.createdAt)}
          {event.note ? <span className="block text-navy-500">“{event.note}”</span> : null}
        </li>
      ))}
    </ol>
  );
}

/** Müşteri ve satıcı ekranlarında ortak iade özeti. */
export function ReturnSummary({ item, showCustomer = false }: { item: ReturnView; showCustomer?: boolean }) {
  return (
    <div className="min-w-0 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <strong className="text-navy-900">{item.returnNo}</strong>
        <ReturnStatusBadge status={item.status} />
      </p>
      <p className="mt-1 text-navy-800">
        {item.productName} × {item.quantity} · Sipariş {item.orderNo}
        {showCustomer ? ` · ${item.customerName}` : ""}
      </p>
      <p className="text-xs text-navy-500">
        Neden: {returnReasonLabels[item.reason]} · İade tutarı: {formatPrice(item.refundAmount)} · {formatWhen(item.createdAt)}
      </p>
      {item.description ? <p className="mt-1 text-xs text-navy-500">Açıklama: {item.description}</p> : null}
      {item.rejectionReason ? <p className="mt-1 text-xs text-rose-600">Ret gerekçesi: {item.rejectionReason}</p> : null}
      {item.carrier || item.trackingNo ? <p className="mt-1 text-xs text-navy-500">Kargo: {item.carrier ?? "—"} · {item.trackingNo ?? "—"}</p> : null}
      <ReturnTimeline events={item.events} />
    </div>
  );
}
