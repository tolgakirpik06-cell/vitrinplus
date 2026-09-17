import type { Coupon, Order } from "@/types/account";

/**
 * /hesabim panelindeki sipariş geçmişi ve kupon listesi için sabit MOCK
 * veri — gerçek bir sipariş/ödeme backend'i olmadığı için burada
 * kodlanmış. Ürünler her zaman gerçek curated ürün slug'larına referans
 * verir (getProductBySlug ile canlı çözülür — isim/görsel burada TEKRAR
 * yazılmaz).
 */
export const mockOrders: Order[] = [
  {
    id: "ord-1",
    orderNumber: "VP-20260828-01",
    date: "2026-08-28",
    seller: "AppleStore Türkiye",
    items: [{ slug: "macbook-air-m3", quantity: 1, priceAtPurchase: 47999 }],
    total: 47999,
    status: "alindi",
  },
  {
    id: "ord-2",
    orderNumber: "VP-20260822-01",
    date: "2026-08-22",
    seller: "TeknoMarket",
    items: [{ slug: "galaxy-s24-ultra", quantity: 1, priceAtPurchase: 52999 }],
    total: 52999,
    status: "iade-surecinde",
  },
  {
    id: "ord-3",
    orderNumber: "VP-20260815-02",
    date: "2026-08-15",
    seller: "SporPoint",
    items: [{ slug: "nike-air-force-1", quantity: 2, priceAtPurchase: 2699 }],
    total: 5398,
    status: "hazirlaniyor",
  },
  {
    id: "ord-4",
    orderNumber: "VP-20260810-01",
    date: "2026-08-10",
    seller: "AppleStore Türkiye",
    items: [{ slug: "apple-watch-s9", quantity: 1, priceAtPurchase: 12999 }],
    total: 12999,
    status: "kargoda",
  },
  {
    id: "ord-5",
    orderNumber: "VP-20260728-01",
    date: "2026-07-28",
    seller: "L'Oréal Türkiye",
    items: [{ slug: "loreal-elixir-parfum", quantity: 2, priceAtPurchase: 1899 }],
    total: 3798,
    status: "iptal-edildi",
  },
  {
    id: "ord-6",
    orderNumber: "VP-20260705-03",
    date: "2026-07-05",
    seller: "EvKeyfi",
    items: [{ slug: "philips-airfryer-xxl", quantity: 1, priceAtPurchase: 6499 }],
    total: 6499,
    status: "teslim-edildi",
  },
  {
    id: "ord-7",
    orderNumber: "VP-20260618-01",
    date: "2026-06-18",
    seller: "AppleStore Türkiye",
    items: [{ slug: "iphone-15-pro-max", quantity: 1, priceAtPurchase: 61999 }],
    total: 61999,
    status: "teslim-edildi",
  },
];

export const mockCoupons: Coupon[] = [
  {
    id: "cpn-1",
    code: "VITRINPLUS10",
    discountLabel: "%10 İndirim",
    minCartLabel: "250 TL ve üzeri sepetlerde",
    validUntil: "2026-12-31",
    scope: "Tüm Kategoriler",
    status: "kullanilabilir",
  },
  {
    id: "cpn-2",
    code: "FREESHIP",
    discountLabel: "Ücretsiz Kargo",
    minCartLabel: "150 TL ve üzeri sepetlerde",
    validUntil: "2026-10-15",
    scope: "Tüm Kategoriler",
    status: "kullanilabilir",
  },
  {
    id: "cpn-3",
    code: "HOSGELDIN50",
    discountLabel: "50 TL İndirim",
    minCartLabel: "300 TL ve üzeri sepetlerde",
    validUntil: "2026-08-01",
    scope: "Elektronik",
    status: "kullanildi",
  },
  {
    id: "cpn-4",
    code: "KIS2025",
    discountLabel: "%15 İndirim",
    minCartLabel: "400 TL ve üzeri sepetlerde",
    validUntil: "2025-12-31",
    scope: "Giyim",
    status: "suresi-dolmus",
  },
];
