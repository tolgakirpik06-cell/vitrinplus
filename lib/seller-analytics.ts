/**
 * Satıcı paneli türetilmiş veriler — SAF fonksiyonlar (React'e bağımlı değil).
 *
 * Kaynak veri: demo kaydındaki siparişler/ürünler (`lib/demo-marketplace.ts`)
 * ve satıcı operasyon verisi (`lib/seller-ops.ts`). Burada gerçek veriden
 * hesaplanan değerler ile "demo simülasyonu" değerleri (ziyaretçi, görüntülenme)
 * ayrı tutulur; simüle edilen alanlar arayüzde "Demo veri" olarak etiketlenir.
 */
import type { DemoOrder, DemoShop, DemoUser, SellerProduct } from "@/lib/demo-marketplace";
import type { OrderCustomer, OrderEventKey, OrderMeta, ShopOps, StockMovement } from "@/lib/seller-ops";
import { COMMISSION_RATE } from "@/lib/plans";
import { PAYMENT_FEE_RATE, estimatedUnitProfit, unitCost } from "@/lib/profit";
import { dayKey, startOfDay } from "@/lib/format";

export const PAYOUT_DELAY_DAYS = 14;
export const DEFAULT_CRITICAL_THRESHOLD = 5;
const DAY_MS = 86_400_000;

// ─── Sipariş durumu ──────────────────────────────────────────────────────────

export type OrderUiStatus = "yeni" | "hazirlaniyor" | "kargoya-hazir" | "kargoda" | "teslim-edildi" | "iptal";

export const orderUiLabels: Record<OrderUiStatus, string> = {
  yeni: "Yeni Sipariş",
  hazirlaniyor: "Hazırlanıyor",
  "kargoya-hazir": "Kargoya Hazır",
  kargoda: "Kargoda",
  "teslim-edildi": "Teslim Edildi",
  iptal: "İptal Edildi",
};

export function orderUiStatus(order: DemoOrder, meta: OrderMeta | undefined): OrderUiStatus {
  switch (order.status) {
    case "alindi":
      return "yeni";
    case "hazirlaniyor":
      return meta?.labelCreated && meta?.labelPrinted ? "kargoya-hazir" : "hazirlaniyor";
    case "kargoda":
      return "kargoda";
    case "teslim-edildi":
      return "teslim-edildi";
    case "iptal-edildi":
      return "iptal";
  }
}

export type SellerOrderRow = {
  order: DemoOrder;
  /** Yalnızca bu satıcıya ait kalemler. */
  items: DemoOrder["items"];
  quantity: number;
  /** Bu satıcının kalemlerinin toplamı (kupon/kargo hariç). */
  amount: number;
  meta: OrderMeta;
  ui: OrderUiStatus;
  customer: OrderCustomer;
  carrier: string;
  paymentMethod: string;
  /** Maliyeti bilinen kalemlerden tahmini kâr; hiç bilinmiyorsa null. */
  estimatedProfit: number | null;
  createdAt: Date;
  /** Sipariş yalnızca bu satıcıya aitse durumunu satıcı yönetebilir. */
  manageable: boolean;
};

export function productSlug(product: Pick<SellerProduct, "id">): string {
  return `demo-${product.id}`;
}

export function buildSellerOrders(input: {
  orders: DemoOrder[];
  ownerId: string;
  users: DemoUser[];
  products: SellerProduct[];
  ops: ShopOps;
  shop: DemoShop;
}): SellerOrderRow[] {
  const { orders, ownerId, users, products, ops, shop } = input;
  const bySlug = new Map(products.map((product) => [productSlug(product), product]));
  const rows: SellerOrderRow[] = [];
  for (const order of orders) {
    const items = order.items.filter((item) => item.ownerId === ownerId);
    if (!items.length) continue;
    const meta = ops.orderMeta[order.id] ?? {};
    const buyer = users.find((user) => user.id === order.buyerId);
    const customer: OrderCustomer = meta.customer ?? { name: buyer?.name ?? "Demo müşteri", email: buyer?.email };
    let profit = 0;
    let known = false;
    for (const item of items) {
      const product = bySlug.get(item.slug);
      if (!product) continue;
      const perUnit = estimatedUnitProfit({ price: item.price, cost: product.cost, costs: product.costs });
      if (perUnit === null) continue;
      known = true;
      profit += perUnit * item.quantity;
    }
    rows.push({
      order,
      items,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      meta,
      ui: orderUiStatus(order, meta),
      customer,
      carrier: meta.carrier ?? shop.shipping.carrier,
      paymentMethod: meta.paymentMethod ?? "Kredi Kartı",
      estimatedProfit: known ? profit : null,
      createdAt: new Date(order.createdAt),
      manageable: order.items.every((item) => item.ownerId === ownerId),
    });
  }
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export const orderEventLabels: Record<OrderEventKey, string> = {
  alindi: "Sipariş Alındı",
  hazirlaniyor: "Hazırlanıyor",
  etiket: "Kargo Etiketi",
  kargoda: "Kargoya Verildi",
  dagitimda: "Dağıtımda",
  "teslim-edildi": "Teslim Edildi",
  "iptal-edildi": "İptal Edildi",
};

export type TimelineStep = { key: "alindi" | "hazirlaniyor" | "kargoda" | "dagitimda" | "teslim-edildi"; label: string; at: string | null; done: boolean };

/** Sipariş zaman çizelgesi: durumdan türetilir, kayıtlı olay zamanları varsa gösterilir. */
export function buildTimeline(row: SellerOrderRow): TimelineStep[] {
  const events = row.meta.events ?? [];
  const at = (key: OrderEventKey) => events.find((event) => event.key === key)?.at ?? null;
  const status = row.order.status;
  const reached = {
    alindi: true,
    hazirlaniyor: status === "hazirlaniyor" || status === "kargoda" || status === "teslim-edildi",
    kargoda: status === "kargoda" || status === "teslim-edildi",
    dagitimda: status === "teslim-edildi" || (status === "kargoda" && row.meta.outForDelivery === true),
    "teslim-edildi": status === "teslim-edildi",
  };
  return [
    { key: "alindi", label: orderEventLabels.alindi, at: row.order.createdAt, done: reached.alindi },
    { key: "hazirlaniyor", label: orderEventLabels.hazirlaniyor, at: at("hazirlaniyor"), done: reached.hazirlaniyor },
    { key: "kargoda", label: orderEventLabels.kargoda, at: at("kargoda"), done: reached.kargoda },
    { key: "dagitimda", label: orderEventLabels.dagitimda, at: at("dagitimda"), done: reached.dagitimda },
    { key: "teslim-edildi", label: orderEventLabels["teslim-edildi"], at: at("teslim-edildi"), done: reached["teslim-edildi"] },
  ];
}

/** Hazırlama süresini aşmış, henüz kargoya verilmemiş siparişler. */
export function isLateOrder(row: SellerOrderRow, now: Date, preparationDays: number): boolean {
  if (row.ui !== "yeni" && row.ui !== "hazirlaniyor" && row.ui !== "kargoya-hazir") return false;
  return now.getTime() - row.createdAt.getTime() > Math.max(1, preparationDays) * DAY_MS;
}

/** Teslimat adresi eksik/kısa görünen siparişler. */
export function hasAddressProblem(row: SellerOrderRow): boolean {
  if (row.ui === "teslim-edildi" || row.ui === "iptal") return false;
  return row.order.address.trim().length < 12;
}

export type OrderCounts = Record<OrderUiStatus, number> & { total: number };

export function countOrders(rows: SellerOrderRow[]): OrderCounts {
  const counts: OrderCounts = { yeni: 0, hazirlaniyor: 0, "kargoya-hazir": 0, kargoda: 0, "teslim-edildi": 0, iptal: 0, total: rows.length };
  for (const row of rows) counts[row.ui] += 1;
  return counts;
}

export function sumAmount(rows: SellerOrderRow[], predicate?: (row: SellerOrderRow) => boolean): number {
  return rows.reduce((sum, row) => (predicate && !predicate(row) ? sum : sum + row.amount), 0);
}

// ─── Kazanç ──────────────────────────────────────────────────────────────────

/** Brüt tutardan ödeme altyapısı kesintisi ve komisyon düşülmüş net hakediş. */
export function netEarning(gross: number): number {
  return gross * (1 - PAYMENT_FEE_RATE - COMMISSION_RATE);
}

function deliveredAt(row: SellerOrderRow): Date {
  const event = row.meta.events?.find((item) => item.key === "teslim-edildi");
  return event ? new Date(event.at) : row.createdAt;
}

export type PayoutSummary = {
  /** Hesaba aktarılmış net tutar. */
  paidOut: number;
  /** Aktarım bekleyen net tutar (teslim sonrası 14 gün + henüz teslim edilmeyenler). */
  pending: number;
  /** Bir sonraki aktarım tarihi (teslim edilmiş bekleyen sipariş varsa). */
  nextPayoutAt: Date | null;
  /** Bir sonraki aktarımda yatacak net tutar. */
  nextPayoutAmount: number;
};

export function summarizePayouts(rows: SellerOrderRow[], now: Date): PayoutSummary {
  let paidOut = 0;
  let pending = 0;
  let nextPayoutAt: Date | null = null;
  let nextPayoutAmount = 0;
  for (const row of rows) {
    if (row.ui === "iptal") continue;
    const net = netEarning(row.amount);
    if (row.ui === "teslim-edildi") {
      const payAt = new Date(deliveredAt(row).getTime() + PAYOUT_DELAY_DAYS * DAY_MS);
      if (payAt.getTime() <= now.getTime()) {
        paidOut += net;
        continue;
      }
      pending += net;
      const day = startOfDay(payAt).getTime();
      if (nextPayoutAt === null || day < startOfDay(nextPayoutAt).getTime()) {
        nextPayoutAt = startOfDay(payAt);
        nextPayoutAmount = net;
      } else if (day === startOfDay(nextPayoutAt).getTime()) {
        nextPayoutAmount += net;
      }
      continue;
    }
    pending += net;
  }
  return { paidOut, pending, nextPayoutAt, nextPayoutAmount };
}

export type PayoutState = "teslim-bekleniyor" | "planli" | "aktarildi";

/** Sipariş başına hakediş durumu: teslimden PAYOUT_DELAY_DAYS gün sonra aktarılır (demo kuralı). İptaller dahil edilmez. */
export function payoutState(row: SellerOrderRow, now: Date): { state: PayoutState; at: Date | null; net: number } | null {
  if (row.ui === "iptal") return null;
  const net = netEarning(row.amount);
  if (row.ui !== "teslim-edildi") return { state: "teslim-bekleniyor", at: null, net };
  const at = new Date(deliveredAt(row).getTime() + PAYOUT_DELAY_DAYS * DAY_MS);
  return { state: at.getTime() <= now.getTime() ? "aktarildi" : "planli", at, net };
}

export type MonthEarnings = { gross: number; returns: number; paymentFee: number; commission: number; net: number; orderCount: number };

export function monthEarnings(rows: SellerOrderRow[], now: Date): MonthEarnings {
  const inMonth = rows.filter((row) => row.createdAt.getFullYear() === now.getFullYear() && row.createdAt.getMonth() === now.getMonth());
  const gross = sumAmount(inMonth);
  const returns = sumAmount(inMonth, (row) => row.ui === "iptal");
  const paymentFee = (gross - returns) * PAYMENT_FEE_RATE;
  const commission = (gross - returns) * COMMISSION_RATE;
  return { gross, returns, paymentFee, commission, net: gross - returns - paymentFee - commission, orderCount: inMonth.length };
}

// ─── Zaman serisi ────────────────────────────────────────────────────────────

export type SeriesRange = "today" | "7d" | "30d" | "year";

export type SeriesPoint = { key: string; label: string; revenue: number; orders: number };

const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** İptal edilmeyen siparişlerin ciro / adet serisi. */
export function buildSeries(rows: SellerOrderRow[], range: SeriesRange, now: Date): SeriesPoint[] {
  const active = rows.filter((row) => row.ui !== "iptal");
  if (range === "today") {
    const today = dayKey(now);
    const points: SeriesPoint[] = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, "0")}:00`,
      revenue: 0,
      orders: 0,
    }));
    for (const row of active) {
      if (dayKey(row.createdAt) !== today) continue;
      const point = points[row.createdAt.getHours()];
      point.revenue += row.amount;
      point.orders += 1;
    }
    return points;
  }
  if (range === "year") {
    const points: SeriesPoint[] = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      points.push({ key: `${date.getFullYear()}-${date.getMonth()}`, label: MONTH_SHORT[date.getMonth()], revenue: 0, orders: 0 });
    }
    const index = new Map(points.map((point, position) => [point.key, position]));
    for (const row of active) {
      const position = index.get(`${row.createdAt.getFullYear()}-${row.createdAt.getMonth()}`);
      if (position === undefined) continue;
      points[position].revenue += row.amount;
      points[position].orders += 1;
    }
    return points;
  }
  const days = range === "7d" ? 7 : 30;
  const points: SeriesPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(startOfDay(now).getTime() - offset * DAY_MS);
    points.push({ key: dayKey(date), label: `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`, revenue: 0, orders: 0 });
  }
  const index = new Map(points.map((point, position) => [point.key, position]));
  for (const row of active) {
    const position = index.get(dayKey(row.createdAt));
    if (position === undefined) continue;
    points[position].revenue += row.amount;
    points[position].orders += 1;
  }
  return points;
}

// ─── Karşılaştırmalar ────────────────────────────────────────────────────────

export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type DaySummary = { revenue: number; orders: number };

export function summarizeDay(rows: SellerOrderRow[], day: Date): DaySummary {
  const key = dayKey(day);
  let revenue = 0;
  let orders = 0;
  for (const row of rows) {
    if (row.ui === "iptal" || dayKey(row.createdAt) !== key) continue;
    revenue += row.amount;
    orders += 1;
  }
  return { revenue, orders };
}

// ─── Demo simülasyonu: ziyaretçi / görüntülenme ──────────────────────────────

function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Günlük ziyaretçi TAHMİNİ (demo). Gerçek trafik verisi yoktur; sipariş sayısıyla orantılı ve deterministiktir. */
export function simulatedVisitors(shopReference: string, day: Date, ordersThatDay: number, productCount: number): number {
  if (productCount <= 0) return 0;
  const h = hash01(`${shopReference}:${dayKey(day)}`);
  return Math.round(28 + h * 42 + ordersThatDay * (20 + h * 12));
}

/** Ürün görüntülenme TAHMİNİ (demo). */
export function simulatedViews(productId: string, soldUnits: number): number {
  const h = hash01(productId);
  return Math.round(60 + h * 240 + soldUnits * (16 + h * 14));
}

// ─── Stok ────────────────────────────────────────────────────────────────────

export type StockStatus = "out" | "critical" | "normal" | "excess";

export const stockStatusLabels: Record<StockStatus, string> = {
  out: "Stokta Yok",
  critical: "Kritik",
  normal: "Normal",
  excess: "Fazla Stok",
};

export type StockRow = {
  product: SellerProduct;
  /** Depodaki fiziksel adet = satılabilir + rezerve. */
  onHand: number;
  /** Alınmış ama henüz kargoya verilmemiş siparişlerdeki adet (stoktan düşülmüş, depoda duruyor). */
  reserved: number;
  /** Müşteriye satılabilir adet (ürün kaydındaki stok). */
  sellable: number;
  sold30: number;
  soldTotal: number;
  dailyRate: number;
  daysLeft: number | null;
  threshold: number;
  status: StockStatus;
  fast: boolean;
  slow: boolean;
};

export function buildStockRows(products: SellerProduct[], rows: SellerOrderRow[], now: Date): StockRow[] {
  const reserved = new Map<string, number>();
  const sold30 = new Map<string, number>();
  const soldTotal = new Map<string, number>();
  const since = now.getTime() - 30 * DAY_MS;
  for (const row of rows) {
    if (row.ui === "iptal") continue;
    const holdsStock = row.ui === "yeni" || row.ui === "hazirlaniyor" || row.ui === "kargoya-hazir";
    for (const item of row.items) {
      soldTotal.set(item.slug, (soldTotal.get(item.slug) ?? 0) + item.quantity);
      if (holdsStock) reserved.set(item.slug, (reserved.get(item.slug) ?? 0) + item.quantity);
      if (row.createdAt.getTime() >= since) sold30.set(item.slug, (sold30.get(item.slug) ?? 0) + item.quantity);
    }
  }
  return products.map((product) => {
    const slug = productSlug(product);
    const reservedQty = reserved.get(slug) ?? 0;
    const sellable = Math.max(0, product.stock);
    const soldLast30 = sold30.get(slug) ?? 0;
    const dailyRate = soldLast30 / 30;
    const daysLeft = dailyRate > 0 ? sellable / dailyRate : null;
    const threshold = product.criticalThreshold ?? DEFAULT_CRITICAL_THRESHOLD;
    let status: StockStatus = "normal";
    if (sellable <= 0) status = "out";
    else if (sellable <= threshold) status = "critical";
    else if ((daysLeft !== null && daysLeft > 90) || (soldLast30 === 0 && sellable >= 50)) status = "excess";
    return {
      product,
      onHand: sellable + reservedQty,
      reserved: reservedQty,
      sellable,
      sold30: soldLast30,
      soldTotal: soldTotal.get(slug) ?? 0,
      dailyRate,
      daysLeft,
      threshold,
      status,
      fast: daysLeft !== null && daysLeft <= 7 && sellable > 0,
      slow: sellable > 0 && (soldLast30 === 0 || (daysLeft !== null && daysLeft > 60)),
    };
  });
}

export function formatDaysLeft(row: StockRow): string {
  if (row.status === "out") return "Stok Yok";
  if (row.daysLeft === null) return "—";
  if (row.daysLeft > 365) return "365+ gün";
  return `${Math.max(1, Math.floor(row.daysLeft))} gün`;
}

export type StockSummary = {
  totalValue: number;
  critical: number;
  out: number;
  excess: number;
  todayIn: number;
  todayOut: number;
};

export function summarizeStock(stockRows: StockRow[], movements: StockMovement[], now: Date): StockSummary {
  const today = dayKey(now);
  let todayIn = 0;
  let todayOut = 0;
  for (const movement of movements) {
    if (dayKey(new Date(movement.at)) !== today) continue;
    if (movement.delta > 0) todayIn += movement.delta;
    else todayOut += -movement.delta;
  }
  return {
    totalValue: stockRows.reduce((sum, row) => sum + row.sellable * unitCost(row.product), 0),
    critical: stockRows.filter((row) => row.status === "critical").length,
    out: stockRows.filter((row) => row.status === "out").length,
    excess: stockRows.filter((row) => row.status === "excess").length,
    todayIn,
    todayOut,
  };
}

/** Stok hareketleri: kayıtlı manuel hareketler + siparişlerden türetilen satış/iptal hareketleri. */
export function buildMovements(rows: SellerOrderRow[], stored: StockMovement[], productIds: Set<string>): StockMovement[] {
  const derived: StockMovement[] = [];
  for (const row of rows) {
    for (const item of row.items) {
      const productId = item.slug.replace(/^demo-/, "");
      if (!productIds.has(productId)) continue;
      derived.push({ id: `sale-${row.order.id}-${item.slug}`, productId, delta: -item.quantity, reason: `Satış · ${row.order.id}`, at: row.order.createdAt });
      if (row.ui === "iptal") {
        const cancelledAt = row.meta.events?.find((event) => event.key === "iptal-edildi")?.at ?? row.order.createdAt;
        derived.push({ id: `cancel-${row.order.id}-${item.slug}`, productId, delta: item.quantity, reason: `İptal · ${row.order.id}`, at: cancelledAt });
      }
    }
  }
  return [...stored, ...derived].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ─── Mağaza sağlığı ──────────────────────────────────────────────────────────

export type StoreHealth = {
  /** Sipariş yoksa null (puan hesaplanamaz). */
  score: number | null;
  label: string;
  shippingRate: number;
  cancelRate: number;
  returnRate: number;
  stockRate: number;
};

export function computeStoreHealth(rows: SellerOrderRow[], products: SellerProduct[], now: Date, preparationDays: number): StoreHealth {
  const active = rows.filter((row) => row.ui !== "iptal");
  const cancelled = rows.length - active.length;
  const cancelRate = rows.length ? (cancelled / rows.length) * 100 : 0;
  const returnRate = 0; // İade sistemi sonraki aşamada; şimdilik iade kaydı yok.
  const due = active.filter((row) => now.getTime() - row.createdAt.getTime() > Math.max(1, preparationDays) * DAY_MS);
  const onTime = due.filter((row) => row.ui === "kargoda" || row.ui === "teslim-edildi").length;
  const shippingRate = due.length ? (onTime / due.length) * 100 : 100;
  const live = products.filter((product) => product.status !== "pasif" && product.status !== "taslak");
  const stockRate = live.length ? (live.filter((product) => product.stock > 0).length / live.length) * 100 : 100;
  if (!rows.length) return { score: null, label: "Henüz veri yok", shippingRate, cancelRate, returnRate, stockRate };
  const score = Math.max(0, Math.min(100, Math.round(shippingRate * 0.35 + Math.max(0, 100 - cancelRate * 5) * 0.25 + Math.max(0, 100 - returnRate * 5) * 0.15 + stockRate * 0.25)));
  const label = score >= 90 ? "Mükemmel" : score >= 75 ? "İyi" : score >= 50 ? "Geliştirilmeli" : "Dikkat";
  return { score, label, shippingRate, cancelRate, returnRate, stockRate };
}

// ─── Yapılacaklar, aksiyonlar, bildirimler ───────────────────────────────────

export type Tone = "danger" | "warning" | "info" | "success" | "neutral";

export type ActionAlert = { id: string; label: string; count: number; href: string; tone: Tone };

/** Siparişler ekranındaki "Aksiyon Gerekiyor" uyarıları. Boş liste = aksiyon yok. */
export function buildActionAlerts(rows: SellerOrderRow[], stockRows: StockRow[], now: Date, preparationDays: number): ActionAlert[] {
  const alerts: ActionAlert[] = [];
  const address = rows.filter(hasAddressProblem).length;
  if (address) alerts.push({ id: "address", label: `${address} siparişte adres bilgisi eksik`, count: address, href: "/satici-panel/siparisler?uyari=adres", tone: "warning" });
  const late = rows.filter((row) => isLateOrder(row, now, preparationDays)).length;
  if (late) alerts.push({ id: "late", label: `${late} siparişin kargo süresi geçti`, count: late, href: "/satici-panel/siparisler?uyari=geciken", tone: "danger" });
  const stockIssue = rows.filter((row) => hasStockIssue(row, stockRows)).length;
  if (stockIssue) alerts.push({ id: "stock", label: `${stockIssue} siparişte stok sorunu var`, count: stockIssue, href: "/satici-panel/stok?filtre=stok-yok", tone: "danger" });
  return alerts;
}

/** Kargoya verilmemiş sipariş, silinmiş veya stoğu tükenmiş bir ürün içeriyor. */
export function hasStockIssue(row: SellerOrderRow, stockRows: StockRow[]): boolean {
  if (row.ui !== "yeni" && row.ui !== "hazirlaniyor" && row.ui !== "kargoya-hazir") return false;
  return row.items.some((item) => {
    const stock = stockRows.find((candidate) => productSlug(candidate.product) === item.slug);
    return !stock || stock.status === "out";
  });
}

export type TodoItem = { id: string; tone: Tone; title: string; hint?: string; href: string };

export function buildTodos(input: {
  rows: SellerOrderRow[];
  stockRows: StockRow[];
  payouts: PayoutSummary;
  now: Date;
  preparationDays: number;
}): TodoItem[] {
  const { rows, stockRows, payouts, now, preparationDays } = input;
  const todos: TodoItem[] = [];
  const counts = countOrders(rows);
  const waiting = counts.yeni + counts.hazirlaniyor + counts["kargoya-hazir"];
  if (waiting > 0) {
    todos.push({
      id: "ship",
      tone: "danger",
      title: `${waiting} sipariş hazırlanmayı bekliyor`,
      hint: `${counts["kargoya-hazir"]}'i kargoya hazır`,
      href: "/satici-panel/siparisler?durum=bekleyen",
    });
  }
  const late = rows.filter((row) => isLateOrder(row, now, preparationDays)).length;
  if (late > 0) todos.push({ id: "late", tone: "danger", title: `${late} siparişin kargo süresi geçti`, hint: "Bugün kargoya verilmesi gerekiyor", href: "/satici-panel/siparisler?uyari=geciken" });
  const critical = stockRows.filter((row) => row.status === "critical").length;
  if (critical > 0) todos.push({ id: "stock", tone: "warning", title: `${critical} ürünün stoğu kritik`, hint: "Acil kontrol et", href: "/satici-panel/stok?filtre=kritik" });
  const out = stockRows.filter((row) => row.status === "out").length;
  if (out > 0) todos.push({ id: "out", tone: "warning", title: `${out} ürün stokta yok`, hint: "Stok girişi yap veya pasife al", href: "/satici-panel/stok?filtre=stok-yok" });
  if (payouts.nextPayoutAt && payouts.nextPayoutAmount > 0) {
    todos.push({
      id: "payout",
      tone: "success",
      title: `${Math.round(payouts.nextPayoutAmount).toLocaleString("tr-TR")} TL ödeme ${payouts.nextPayoutAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}'de hesabına aktarılacak`,
      href: "/satici-panel/odemeler",
    });
  }
  return todos;
}

export type NotificationItem = { id: string; tone: Tone; title: string; detail: string; at: string; href: string };

export function buildNotifications(input: { rows: SellerOrderRow[]; stockRows: StockRow[]; products: SellerProduct[] }): NotificationItem[] {
  const { rows, stockRows, products } = input;
  const items: NotificationItem[] = [];
  for (const row of rows.slice(0, 5)) {
    items.push({
      id: `order-${row.order.id}`,
      tone: row.ui === "iptal" ? "danger" : "info",
      title: row.ui === "iptal" ? `Sipariş iptal edildi #${row.order.id}` : `Yeni sipariş #${row.order.id}`,
      detail: `${row.items[0]?.name ?? "Ürün"} · ${Math.round(row.amount).toLocaleString("tr-TR")} TL`,
      at: row.order.createdAt,
      href: `/satici-panel/siparisler?siparis=${encodeURIComponent(row.order.id)}`,
    });
  }
  for (const stock of stockRows.filter((row) => row.status === "critical" || row.status === "out").slice(0, 4)) {
    items.push({
      id: `stock-${stock.product.id}-${stock.status}-${stock.sellable}`,
      tone: stock.status === "out" ? "danger" : "warning",
      title: stock.status === "out" ? "Stok tükendi" : "Stok uyarısı",
      detail: `${stock.product.name} (${stock.sellable} adet kaldı)`,
      at: stock.product.createdAt ?? rows[0]?.order.createdAt ?? new Date(0).toISOString(),
      href: `/satici-panel/stok?urun=${encodeURIComponent(stock.product.id)}`,
    });
  }
  const drafts = products.filter((product) => product.status === "taslak").length;
  if (drafts > 0) {
    items.push({ id: `drafts-${drafts}`, tone: "neutral", title: "Yayınlanmamış taslak ürünler", detail: `${drafts} taslak ürün satışa yayınlanmayı bekliyor`, at: new Date(0).toISOString(), href: "/satici-panel/urunler?durum=taslak" });
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ─── Ürün performansı ────────────────────────────────────────────────────────

export type ProductPerformance = {
  product: SellerProduct;
  sold: number;
  revenue: number;
  profit: number | null;
  views: number;
};

export function buildProductPerformance(products: SellerProduct[], rows: SellerOrderRow[]): ProductPerformance[] {
  const sold = new Map<string, number>();
  const revenue = new Map<string, number>();
  for (const row of rows) {
    if (row.ui === "iptal") continue;
    for (const item of row.items) {
      sold.set(item.slug, (sold.get(item.slug) ?? 0) + item.quantity);
      revenue.set(item.slug, (revenue.get(item.slug) ?? 0) + item.price * item.quantity);
    }
  }
  return products.map((product) => {
    const slug = productSlug(product);
    const units = sold.get(slug) ?? 0;
    const perUnit = estimatedUnitProfit({ price: product.price, cost: product.cost, costs: product.costs });
    return { product, sold: units, revenue: revenue.get(slug) ?? 0, profit: perUnit === null ? null : perUnit * units, views: simulatedViews(product.id, units) };
  });
}
