/**
 * Gerçek hesap modunda sipariş meta verisi iki kaynaktan gelir:
 *  - sunucu (gerçek olay zamanları, kargo firması / takip no, satıcı notu) → GÜVENİLİR, öncelikli,
 *  - yerel satıcı operasyon kaydı (henüz sunucuya yazılmamış iyimser bayraklar, ör. "etiket oluşturuldu").
 * Sunucudaki tanımsız (undefined) alan yerel değeri EZMEZ. SAF fonksiyonlar (React / depolama yok).
 */
import type { PlanKey } from "@/lib/plans";
import type { OrderEvent, OrderMeta, ShopOps } from "@/lib/seller-ops";

export function mergeOrderMeta(local: OrderMeta | undefined, server: OrderMeta | undefined): OrderMeta {
  const result: OrderMeta = { ...local };
  if (!server) return result;
  for (const key of Object.keys(server) as (keyof OrderMeta)[]) {
    const value = server[key];
    if (value === undefined || key === "events") continue;
    (result as Record<string, unknown>)[key] = value;
  }
  const serverEvents = server.events ?? [];
  const localEvents = (local?.events ?? []).filter((event) => !serverEvents.some((known) => known.key === event.key));
  const events: OrderEvent[] = [...serverEvents, ...localEvents].sort((a, b) => a.at.localeCompare(b.at));
  if (events.length) result.events = events;
  return result;
}

export function mergeServerOps(local: ShopOps, server: Readonly<Record<string, OrderMeta>>, planKey?: PlanKey): ShopOps {
  const orderMeta: Record<string, OrderMeta> = { ...local.orderMeta };
  for (const [orderNo, meta] of Object.entries(server)) orderMeta[orderNo] = mergeOrderMeta(local.orderMeta[orderNo], meta);
  return { ...local, orderMeta, planKey: planKey ?? local.planKey };
}
