import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { orderUiLabels, type OrderUiStatus } from "@/lib/seller-analytics";

export const orderUiTones: Record<OrderUiStatus, BadgeTone> = {
  yeni: "brand",
  hazirlaniyor: "warning",
  "kargoya-hazir": "info",
  kargoda: "info",
  "teslim-edildi": "success",
  iptal: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderUiStatus }) {
  return <StatusBadge tone={orderUiTones[status]}>{orderUiLabels[status]}</StatusBadge>;
}
