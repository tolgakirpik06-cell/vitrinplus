/**
 * Vitrin AI — DEMO yanıt motoru (saf fonksiyonlar).
 *
 * Gerçek bir yapay zekâ servisine BAĞLI DEĞİL. Sorular önceden tanımlı
 * niyetlere eşlenir ve yanıtlar satıcının demo verisinden (sipariş, stok, ürün)
 * hesaplanır; veri yoksa uydurma bir sonuç üretilmez, açıkça "veri yok" denir.
 * İleride gerçek bir model bağlandığında aynı `AiAnswer` biçimi kullanılabilir.
 */
import type { SellerProduct } from "@/lib/demo-marketplace";
import { formatInteger, formatPercent, formatTL } from "@/lib/format";
import {
  buildProductPerformance,
  isLateOrder,
  formatDaysLeft,
  type SellerOrderRow,
  type StockRow,
} from "@/lib/seller-analytics";

export type AiIntent = "sales-drop" | "low-stock" | "top-profit" | "ship-today" | "late-orders" | "stock-7d" | "fastest-selling";

export type AiSuggestion = { intent: AiIntent; label: string; scope: "genel" | "stok" };

export const aiSuggestions: AiSuggestion[] = [
  { intent: "sales-drop", label: "Satışlarım neden düştü?", scope: "genel" },
  { intent: "low-stock", label: "Stoğu bitecek ürünleri bul", scope: "genel" },
  { intent: "top-profit", label: "En çok kazandıran 5 ürünüm hangisi?", scope: "genel" },
  { intent: "ship-today", label: "Bugün kargoya verilmesi gerekenleri seç", scope: "genel" },
  { intent: "late-orders", label: "Geciken siparişleri göster", scope: "genel" },
  { intent: "stock-7d", label: "7 gün içinde bitebilecek ürünleri göster", scope: "stok" },
  { intent: "fastest-selling", label: "En hızlı tükenen ürünlerim?", scope: "stok" },
];

export type AiContext = {
  rows: SellerOrderRow[];
  stockRows: StockRow[];
  products: SellerProduct[];
  now: Date;
  preparationDays: number;
};

export type AiListItem = { label: string; detail: string; href: string };

export type AiAnswer = {
  title: string;
  lines: string[];
  items?: AiListItem[];
  action?: { label: string; href: string };
};

const DAY_MS = 86_400_000;
const BASE = "/satici-panel";

function inWindow(row: SellerOrderRow, from: number, to: number): boolean {
  const time = row.createdAt.getTime();
  return time >= from && time < to;
}

function windowStats(rows: SellerOrderRow[], from: number, to: number) {
  const inRange = rows.filter((row) => inWindow(row, from, to));
  const active = inRange.filter((row) => row.ui !== "iptal");
  const revenue = active.reduce((sum, row) => sum + row.amount, 0);
  return { orders: active.length, cancelled: inRange.length - active.length, revenue, basket: active.length ? revenue / active.length : 0 };
}

export function answerIntent(intent: AiIntent, context: AiContext): AiAnswer {
  const { rows, stockRows, products, now, preparationDays } = context;
  const nowMs = now.getTime();

  switch (intent) {
    case "sales-drop": {
      const current = windowStats(rows, nowMs - 7 * DAY_MS, nowMs + 1);
      const previous = windowStats(rows, nowMs - 14 * DAY_MS, nowMs - 7 * DAY_MS);
      if (previous.orders === 0) {
        return {
          title: "Satış karşılaştırması",
          lines: ["Önceki 7 güne ait sipariş verisi olmadığı için düşüş/artış karşılaştırması yapamıyorum.", "Sipariş geçmişin oluştukça bu analiz otomatik olarak dolar."],
          action: { label: "Analizlere Git", href: `${BASE}/analizler` },
        };
      }
      const change = ((current.revenue - previous.revenue) / previous.revenue) * 100;
      if (change >= 0) {
        return {
          title: "Satışların düşmedi",
          lines: [`Son 7 gün cirosu ${formatTL(current.revenue)}; önceki 7 gün ${formatTL(previous.revenue)} (${formatPercent(change)} artış).`],
          action: { label: "Analizlere Git", href: `${BASE}/analizler` },
        };
      }
      const reasons: string[] = [];
      if (current.orders < previous.orders) reasons.push(`Sipariş sayısı ${previous.orders} → ${current.orders} düştü.`);
      if (current.basket < previous.basket * 0.95) reasons.push(`Ortalama sepet ${formatTL(previous.basket)} → ${formatTL(current.basket)} indi.`);
      if (current.cancelled > previous.cancelled) reasons.push(`İptal edilen sipariş ${previous.cancelled} → ${current.cancelled} çıktı.`);
      const outCount = stockRows.filter((row) => row.status === "out").length;
      if (outCount > 0) reasons.push(`${outCount} ürünün stoğu tükenmiş; satışa kapalı ürün ciroyu düşürür.`);
      if (!reasons.length) reasons.push("Belirgin bir tekil neden görünmüyor; düşüş genel sipariş hacmindeki dalgalanmadan kaynaklanıyor olabilir.");
      return {
        title: `Satışların ${formatPercent(Math.abs(change))} düştü`,
        lines: [`Son 7 gün cirosu ${formatTL(current.revenue)}; önceki 7 gün ${formatTL(previous.revenue)}.`, ...reasons],
        action: { label: "Analizlere Git", href: `${BASE}/analizler` },
      };
    }

    case "low-stock":
    case "stock-7d": {
      const list =
        intent === "stock-7d"
          ? stockRows.filter((row) => row.fast || (row.status === "critical" && row.daysLeft !== null && row.daysLeft <= 7))
          : stockRows.filter((row) => row.status === "critical" || row.status === "out" || row.fast);
      if (!list.length) {
        return { title: "Stok durumu sağlıklı", lines: ["Kısa sürede tükenecek ya da kritik seviyede ürün görünmüyor."], action: { label: "Stok Yönetimi", href: `${BASE}/stok` } };
      }
      const sorted = [...list].sort((a, b) => (a.daysLeft ?? -1) - (b.daysLeft ?? -1));
      return {
        title: `${sorted.length} ürünün stoğu yakında bitebilir`,
        lines: ["Son 30 günlük satış hızına göre hesaplandı."],
        items: sorted.slice(0, 6).map((row) => ({
          label: row.product.name,
          detail: row.status === "out" ? "Stokta yok" : `${formatInteger(row.sellable)} adet · ${row.daysLeft !== null ? `yaklaşık ${formatDaysLeft(row)} stok kaldı` : "kritik eşiğin altında"}`,
          href: `${BASE}/stok?urun=${encodeURIComponent(row.product.id)}`,
        })),
        action: { label: "Stok Yönetimine Git", href: `${BASE}/stok?filtre=kritik` },
      };
    }

    case "top-profit": {
      const performance = buildProductPerformance(products, rows)
        .filter((item) => item.profit !== null && item.sold > 0)
        .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
        .slice(0, 5);
      if (!performance.length) {
        return {
          title: "Kâr sıralaması hesaplanamadı",
          lines: ["Satılmış ve maliyeti girilmiş ürün bulunamadı.", "Ürünlerine maliyet ekledikçe en çok kazandıran ürünlerini burada göreceksin."],
          action: { label: "Ürünlere Git", href: `${BASE}/urunler` },
        };
      }
      return {
        title: "En çok kazandıran ürünlerin",
        lines: ["Tahmini kâr = (satış fiyatı − girilen maliyetler) × satılan adet. Maliyeti girilmemiş ürünler dahil değildir."],
        items: performance.map((item) => ({
          label: item.product.name,
          detail: `${formatTL(item.profit ?? 0)} tahmini kâr · ${formatInteger(item.sold)} adet`,
          href: `${BASE}/urunler`,
        })),
        action: { label: "Ürünlere Git", href: `${BASE}/urunler` },
      };
    }

    case "ship-today": {
      const waiting = rows.filter((row) => row.ui === "yeni" || row.ui === "hazirlaniyor" || row.ui === "kargoya-hazir");
      if (!waiting.length) return { title: "Kargolanacak sipariş yok", lines: ["Bekleyen sipariş görünmüyor."], action: { label: "Siparişlere Git", href: `${BASE}/siparisler` } };
      const ordered = [...waiting].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return {
        title: `${waiting.length} sipariş kargoya verilmeyi bekliyor`,
        lines: ["En eski sipariş en üstte. Siparişler ekranında seçip toplu hazırlayabilirsin."],
        items: ordered.slice(0, 6).map((row) => ({
          label: `#${row.order.id} · ${row.customer.name}`,
          detail: `${row.items[0]?.name ?? "Ürün"}${row.items.length > 1 ? ` +${row.items.length - 1}` : ""} · ${formatTL(row.amount)}`,
          href: `${BASE}/siparisler?siparis=${encodeURIComponent(row.order.id)}`,
        })),
        action: { label: "Bekleyen Siparişleri Seç", href: `${BASE}/siparisler?durum=bekleyen` },
      };
    }

    case "late-orders": {
      const late = rows.filter((row) => isLateOrder(row, now, preparationDays));
      if (!late.length) return { title: "Geciken sipariş yok", lines: [`Hazırlama süren ${preparationDays} gün; bu süreyi aşan sipariş görünmüyor.`], action: { label: "Siparişlere Git", href: `${BASE}/siparisler` } };
      return {
        title: `${late.length} sipariş gecikmiş`,
        lines: [`Hazırlama süresi (${preparationDays} gün) aşıldı; müşteri memnuniyeti ve mağaza puanın için öncelik ver.`],
        items: late.slice(0, 6).map((row) => ({
          label: `#${row.order.id} · ${row.customer.name}`,
          detail: `${Math.max(1, Math.floor((nowMs - row.createdAt.getTime()) / DAY_MS))} gündür bekliyor · ${formatTL(row.amount)}`,
          href: `${BASE}/siparisler?siparis=${encodeURIComponent(row.order.id)}`,
        })),
        action: { label: "Geciken Siparişler", href: `${BASE}/siparisler?uyari=geciken` },
      };
    }

    case "fastest-selling": {
      const fast = stockRows.filter((row) => row.sold30 > 0).sort((a, b) => b.dailyRate - a.dailyRate).slice(0, 5);
      if (!fast.length) return { title: "Satış hızı hesaplanamadı", lines: ["Son 30 günde satılan ürün bulunamadı."], action: { label: "Stok Yönetimi", href: `${BASE}/stok` } };
      return {
        title: "En hızlı tükenen ürünlerin",
        lines: ["Son 30 günlük satış hızına göre sıralandı."],
        items: fast.map((row) => ({
          label: row.product.name,
          detail: `günde ~${row.dailyRate.toFixed(1).replace(".", ",")} adet · ${row.status === "out" ? "stokta yok" : `${formatInteger(row.sellable)} adet kaldı`}`,
          href: `${BASE}/stok?urun=${encodeURIComponent(row.product.id)}`,
        })),
        action: { label: "Stok Yönetimi", href: `${BASE}/stok` },
      };
    }
  }
}

const keywordMap: { intent: AiIntent; words: string[] }[] = [
  { intent: "sales-drop", words: ["düş", "azal", "neden", "satış"] },
  { intent: "stock-7d", words: ["7 gün", "bitebilecek", "haftaya"] },
  { intent: "fastest-selling", words: ["hızlı", "tüken"] },
  { intent: "low-stock", words: ["stok", "bitecek", "kritik"] },
  { intent: "top-profit", words: ["kazandıran", "kâr", "kar ", "karlı", "kârlı"] },
  { intent: "ship-today", words: ["kargo", "bugün", "gönder"] },
  { intent: "late-orders", words: ["gecik"] },
];

/** Serbest metni bilinen bir niyete eşler; eşleşme yoksa null (uydurma yanıt üretilmez). */
export function matchIntent(text: string): AiIntent | null {
  const normalized = text.toLocaleLowerCase("tr-TR").trim();
  if (!normalized) return null;
  const exact = aiSuggestions.find((suggestion) => suggestion.label.toLocaleLowerCase("tr-TR") === normalized);
  if (exact) return exact.intent;
  for (const entry of keywordMap) if (entry.words.some((word) => normalized.includes(word))) return entry.intent;
  return null;
}
