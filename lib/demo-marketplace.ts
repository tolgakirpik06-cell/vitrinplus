import type { Product, CartLine } from "@/types";

export type DemoUser = { id: string; name: string; email: string };
export type ProductStatus = "aktif" | "pasif" | "taslak";
/**
 * Satıcı ürünü. Zorunlu alanlar eski kayıtlarla aynıdır; sonrasında eklenen
 * alanlar isteğe bağlıdır, bu yüzden mevcut localStorage kayıtları olduğu gibi çalışır.
 * `cost` ve `costs` yalnızca satıcıya aittir — müşteriye giden ürüne (shopProduct) ASLA geçmez.
 */
export type SellerProduct = {
  id: string; name: string; sku: string; category: string; price: number; cost: number; stock: number;
  status?: ProductStatus;
  brand?: string; model?: string; shortDescription?: string; description?: string;
  images?: string[];
  costs?: { shipping?: number; packaging?: number; payment?: number; other?: number };
  salePrice?: number; saleStart?: string; saleEnd?: string;
  criticalThreshold?: number; autoPassive?: boolean;
  /** Varyant seçenekleri (yalnızca satıcı paneli için; stok ürün düzeyinde tutulur). */
  variants?: { id: string; label: string; sku?: string }[];
  sample?: boolean; createdAt?: string;
};
export type SellerCampaign = { id: string; name: string; discountPercent: number; endDate: string };
export type SellerSettings = { storeName: string; description: string; contactEmail: string; contactPhone: string };
export type SellerShipping = { shippingFee: number; freeShippingThreshold: number; preparationDays: number; carrier: string };
export type DemoShop = {
  ownerId: string; reference: string; status: "bekliyor" | "onaylandi" | "reddedildi";
  products: SellerProduct[]; campaigns: SellerCampaign[]; settings: SellerSettings; shipping: SellerShipping;
};
export type DemoOrderStatus = "alindi" | "hazirlaniyor" | "kargoda" | "teslim-edildi" | "iptal-edildi";
export type DemoOrder = {
  id: string; buyerId: string; createdAt: string; status: DemoOrderStatus;
  items: { slug: string; name: string; seller: string; ownerId?: string; quantity: number; price: number; variantLabel?: string }[];
  address: string; billingAddress: string; subtotal: number; discount: number; shipping: number; total: number;
};
export type DemoState = { version: 1; users: DemoUser[]; currentUserId: string | null; shops: DemoShop[]; orders: DemoOrder[]; sold: Record<string, number> };
export const emptyDemo: DemoState = { version: 1, users: [], currentUserId: null, shops: [], orders: [], sold: {} };
export const orderLabels: Record<DemoOrderStatus, string> = { alindi: "Alındı", hazirlaniyor: "Hazırlanıyor", kargoda: "Kargoda", "teslim-edildi": "Teslim edildi", "iptal-edildi": "İptal edildi" };
export function totals(subtotal: number, coupon: string | null, express = false) {
  const discount = coupon === "VITRINPLUS10" ? Math.round(subtotal * 10) / 100 : 0;
  const shipping = subtotal === 0 ? 0 : (subtotal - discount >= 250 ? 0 : 49.9) + (express ? 29.9 : 0);
  return { subtotal, discount, shipping, total: Math.round((subtotal - discount + shipping) * 100) / 100 };
}
/** Yalnızca aktif (pasif / taslak olmayan) ürünler müşteriye satılabilir. Eski kayıtlarda status yoktur → satılabilir. */
export function isSellable(product: SellerProduct): boolean { return product.status !== "pasif" && product.status !== "taslak"; }
/** Tarih aralığındaki indirimli fiyat geçerliyse döner. */
export function activeSalePrice(product: SellerProduct, now: Date = new Date()): number | null {
  const sale = product.salePrice;
  if (!sale || !Number.isFinite(sale) || sale <= 0 || sale >= product.price) return null;
  if (product.saleStart && now < new Date(product.saleStart)) return null;
  if (product.saleEnd) { const end = new Date(product.saleEnd); end.setHours(23, 59, 59, 999); if (now > end) return null; }
  return sale;
}
export function shopProduct(product: SellerProduct, shop: DemoShop): Product {
  // Maliyet, ek maliyetler, örnek işareti ve satıcı görselleri müşteri tarafına geçmez.
  const { cost: _cost, costs: _costs, sample: _sample, images: _images, criticalThreshold: _threshold, autoPassive: _auto, salePrice: _sale, saleStart: _start, saleEnd: _end, status: _status, createdAt: _created, variants: _variants, shortDescription, description, brand, model, ...publicFields } = product;
  void [_cost, _costs, _sample, _images, _threshold, _auto, _sale, _start, _end, _status, _created, _variants];
  const sale = activeSalePrice(product);
  const specifications = [{ label: "SKU", value: product.sku }, ...(brand?.trim() ? [{ label: "Marka", value: brand.trim() }] : []), ...(model?.trim() ? [{ label: "Model", value: model.trim() }] : [])];
  return { ...publicFields, price: sale ?? product.price, ...(sale ? { oldPrice: product.price, discount: Math.round((1 - sale / product.price) * 100) } : {}),
    slug: `demo-${product.id}`, brand: brand?.trim() || shop.settings.storeName, seller: shop.settings.storeName,
    rating: 0, reviewCount: 0, shipping: { label: "Demo teslimat", variant: "standard" },
    aiTag: { type: "smart", label: "Demo mağaza ürünü" }, visual: "generic", icon: "shopping-bag", images: [],
    description: description?.trim() || shortDescription?.trim() || shop.settings.description || "Satıcı tarafından eklenen demo ürün.", specifications, tags: ["yeni-gelenler"] };
}
export function placeDemoOrder(state: DemoState, lines: CartLine[], catalog: (slug: string) => Product | undefined | null, details: { address: string; billingAddress: string; coupon: string | null; express: boolean }, id: string): { state: DemoState; order: DemoOrder } {
  if (!state.currentUserId) throw new Error("Sipariş için demo hesabına giriş yap.");
  if (!lines.length) throw new Error("Sepetin boş.");
  if (state.orders.some(order => order.id === id)) throw new Error("Bu sipariş zaten oluşturuldu.");
  if (!details.address.trim() || !details.billingAddress.trim()) throw new Error("Teslimat ve fatura adresini doldur.");
  const quantities = new Map<string, number>();
  const items = lines.map(line => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Ürün adedi geçersiz.");
    const shop = state.shops.find(s => s.status === "onaylandi" && s.products.some(p => `demo-${p.id}` === line.slug));
    const ownProduct = shop?.products.find(p => `demo-${p.id}` === line.slug && isSellable(p));
    const product = shop && ownProduct ? shopProduct(ownProduct, shop) : line.slug.startsWith("demo-") ? undefined : catalog(line.slug);
    if (!product) throw new Error("Sepetindeki bir ürün artık satışta değil. Sepetini güncelle.");
    const quantity = (quantities.get(line.slug) ?? 0) + line.quantity;
    quantities.set(line.slug, quantity);
    const available = product.stock - (shop ? 0 : state.sold[line.slug] ?? 0);
    if (quantity > available) throw new Error(`${product.name}: stokta ${available} adet var.`);
    return { slug: line.slug, name: product.name, seller: product.seller, ownerId: shop?.ownerId, quantity: line.quantity, price: product.price, variantLabel: line.variantLabel };
  });
  const pricing = totals(items.reduce((sum, item) => sum + item.price * item.quantity, 0), details.coupon, details.express);
  const order: DemoOrder = { id, buyerId: state.currentUserId, createdAt: new Date().toISOString(), status: "alindi", items, address: details.address, billingAddress: details.billingAddress, ...pricing };
  const sold = { ...state.sold };
  for (const item of items) if (!item.ownerId) sold[item.slug] = (sold[item.slug] ?? 0) + item.quantity;
  const shops = state.shops.map(shop => ({ ...shop, products: shop.products.map(p => {
    const quantity = quantities.get(`demo-${p.id}`) ?? 0;
    const stock = p.stock - quantity;
    return { ...p, stock, ...(quantity > 0 && stock <= 0 && p.autoPassive ? { status: "pasif" as const } : {}) };
  }) }));
  return { order, state: { ...state, shops, sold, orders: [order, ...state.orders] } };
}
export function transitionOrder(state: DemoState, id: string, status: DemoOrderStatus, admin = false): DemoState {
  const order = state.orders.find(o => o.id === id);
  if (!order) throw new Error("Sipariş bulunamadı.");
  const seller = order.items.every(item => item.ownerId === state.currentUserId);
  const buyer = order.buyerId === state.currentUserId;
  const allowed: Record<DemoOrderStatus, DemoOrderStatus[]> = { alindi: ["hazirlaniyor", "iptal-edildi"], hazirlaniyor: ["kargoda", "iptal-edildi"], kargoda: ["teslim-edildi"], "teslim-edildi": [], "iptal-edildi": [] };
  if (!allowed[order.status].includes(status)) throw new Error("Bu durum değişikliği yapılamaz.");
  if (!admin && !(status === "iptal-edildi" && buyer) && !seller) throw new Error("Bu siparişi güncelleme yetkin yok.");
  let shops = state.shops;
  const sold = { ...state.sold };
  if (status === "iptal-edildi") {
    shops = shops.map(shop => ({ ...shop, products: shop.products.map(p => ({ ...p, stock: p.stock + order.items.filter(i => i.slug === `demo-${p.id}`).reduce((sum, i) => sum + i.quantity, 0) })) }));
    for (const item of order.items) if (!item.ownerId) sold[item.slug] = Math.max(0, (sold[item.slug] ?? 0) - item.quantity);
  }
  return { ...state, shops, sold, orders: state.orders.map(o => o.id === id ? { ...o, status } : o) };
}
