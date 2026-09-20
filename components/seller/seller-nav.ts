import { BarChart3, Boxes, CreditCard, HandCoins, LayoutDashboard, Megaphone, MessageCircle, Package, Rocket, RotateCcw, Settings, ShoppingBag, Store, Gem } from "lucide-react";
import type { NavItem } from "@/components/dashboard/Sidebar";

export const SELLER_BASE = "/satici-panel";

export const sellerHref = {
  overview: SELLER_BASE,
  orders: `${SELLER_BASE}/siparisler`,
  products: `${SELLER_BASE}/urunler`,
  newProduct: `${SELLER_BASE}/urunler/yeni`,
  stock: `${SELLER_BASE}/stok`,
  campaigns: `${SELLER_BASE}/kampanyalar`,
  ads: `${SELLER_BASE}/reklam`,
  earnings: `${SELLER_BASE}/kazanclar`,
  payouts: `${SELLER_BASE}/odemeler`,
  returns: `${SELLER_BASE}/iadeler`,
  analytics: `${SELLER_BASE}/analizler`,
  questions: `${SELLER_BASE}/sorular`,
  store: `${SELLER_BASE}/magazam`,
  plan: `${SELLER_BASE}/paketim`,
  settings: `${SELLER_BASE}/ayarlar`,
} as const;

/** Rozet sayaçları (yalnızca gerçek veriden gelenler). */
export type SellerNavBadges = { orders?: number; questions?: number };

/** Kenar çubuğu menüsü — sıra referans tasarıma göre sabittir. */
export function buildSellerNav(badges: SellerNavBadges = {}): NavItem[] {
  return [
    { key: "overview", label: "Genel Bakış", href: sellerHref.overview, icon: LayoutDashboard, exact: true },
    { key: "orders", label: "Siparişler", href: sellerHref.orders, icon: ShoppingBag, badge: badges.orders, badgeTone: "danger" },
    {
      key: "products",
      label: "Ürünler",
      href: sellerHref.products,
      icon: Package,
      children: [
        { label: "Tüm Ürünler", href: sellerHref.products, exact: true },
        { label: "Ürün Ekle", href: sellerHref.newProduct, exact: true },
      ],
    },
    { key: "stock", label: "Stok Yönetimi", href: sellerHref.stock, icon: Boxes },
    { key: "campaigns", label: "Kampanyalar", href: sellerHref.campaigns, icon: Megaphone },
    { key: "ads", label: "Reklam Ver", href: sellerHref.ads, icon: Rocket },
    { key: "earnings", label: "Kazançlarım", href: sellerHref.earnings, icon: HandCoins },
    { key: "payouts", label: "Ödemeler", href: sellerHref.payouts, icon: CreditCard },
    { key: "returns", label: "İadeler", href: sellerHref.returns, icon: RotateCcw },
    { key: "analytics", label: "Analizler", href: sellerHref.analytics, icon: BarChart3 },
    { key: "questions", label: "Müşteri Soruları", href: sellerHref.questions, icon: MessageCircle, badge: badges.questions, badgeTone: "info" },
    { key: "store", label: "Mağazam", href: sellerHref.store, icon: Store },
    { key: "plan", label: "Paketim", href: sellerHref.plan, icon: Gem },
    { key: "settings", label: "Ayarlar", href: sellerHref.settings, icon: Settings },
  ];
}
