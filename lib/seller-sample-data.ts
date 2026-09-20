/**
 * Satıcı paneli için DEMO örnek veri üreticisi (saf, deterministik).
 *
 * Yeni bir demo mağazanın paneli boş görünür; "Örnek veri yükle" ile bu veri
 * eklenir, "Örnek veriyi kaldır" ile tamamen geri alınır. Örnek kayıtlar
 * kimliklerinden ve `sample` işaretinden tanınır: gerçek (kullanıcının kendi
 * eklediği) ürün ve siparişlere ASLA dokunulmaz.
 *
 * Siparişler "şimdi"ye göre geriye doğru dağıtılır; böylece bugün/dün/son 30
 * gün grafikleri her zaman dolu görünür. Rastgelelik sabit tohumla üretilir.
 */
import type { DemoOrder, SellerProduct } from "@/lib/demo-marketplace";
import type { OrderEvent, OrderMeta, StockMovement } from "@/lib/seller-ops";
import type { SellerQuestion } from "@/lib/questions";

export const SAMPLE_PRODUCT_PREFIX = "orn-";
export const SAMPLE_ORDER_PREFIX = "VP-ORN-";
export const SAMPLE_MOVEMENT_PREFIX = "smp-";
export const SAMPLE_QUESTION_PREFIX = "Q-ORN-";
export const SAMPLE_BUYER_ID = "sample-buyer";

const HOUR_MS = 3_600_000;

export type SampleData = {
  products: SellerProduct[];
  orders: DemoOrder[];
  metas: Record<string, OrderMeta>;
  movements: StockMovement[];
  questions: SellerQuestion[];
};

export const isSampleOrderId = (id: string) => id.startsWith(SAMPLE_ORDER_PREFIX);
export const isSampleProduct = (product: Pick<SellerProduct, "id" | "sample">) => product.sample === true || product.id.startsWith(SAMPLE_PRODUCT_PREFIX);

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ProductSeed = {
  name: string;
  category: string;
  brand: string;
  model: string;
  price: number;
  cost: number;
  stock: number;
  threshold?: number;
  status?: SellerProduct["status"];
  extras?: SellerProduct["costs"];
  short: string;
};

const productSeeds: ProductSeed[] = [
  { name: "Nova Kablosuz Kulaklık Pro", category: "Elektronik", brand: "Nova", model: "KP-500", price: 899, cost: 500, stock: 42, threshold: 10, extras: { shipping: 70, packaging: 15, payment: 25, other: 10 }, short: "Aktif gürültü engelleme, 30 saat pil ömrü." },
  { name: "Akıllı Bileklik Fit 5", category: "Elektronik", brand: "Aria", model: "FIT-5", price: 1299, cost: 720, stock: 6, threshold: 10, extras: { shipping: 60, packaging: 12 }, short: "Nabız ve uyku takibi, 14 gün pil." },
  { name: "Pamuklu Oversize Tişört", category: "Erkek", brand: "Kuzey", model: "OT-210", price: 349, cost: 140, stock: 120, short: "%100 pamuk, unisex kesim." },
  { name: "Çelik Termos Matara 750 ml", category: "Ev & Yaşam", brand: "Kuzey", model: "TM-750", price: 279, cost: 105, stock: 0, short: "12 saat sıcak, 24 saat soğuk tutar." },
  { name: "Slim Fit Kot Pantolon", category: "Erkek", brand: "Aria", model: "KP-32", price: 599, cost: 260, stock: 58, short: "Esnek kumaş, slim fit." },
  { name: "Nova Gaming Mouse RGB", category: "Elektronik", brand: "Nova", model: "GM-7", price: 449, cost: 190, stock: 3, threshold: 8, short: "12.000 DPI sensör, RGB aydınlatma." },
  { name: "Nemlendirici Yüz Kremi 50 ml", category: "Kozmetik", brand: "Aria", model: "YK-50", price: 219, cost: 70, stock: 240, short: "Hyaluronik asit içerikli günlük bakım." },
  { name: "Koşu Ayakkabısı Aero", category: "Spor & Outdoor", brand: "Kuzey", model: "AE-42", price: 1499, cost: 780, stock: 25, extras: { shipping: 80, packaging: 20 }, short: "Hafif taban, nefes alan file." },
  { name: "Deri Cüzdan Klasik", category: "Erkek", brand: "Kuzey", model: "CZ-11", price: 399, cost: 150, stock: 33, short: "Hakiki deri, 8 kart gözü." },
  { name: "Bluetooth Hoparlör Mini", category: "Elektronik", brand: "Nova", model: "HP-mini", price: 649, cost: 310, stock: 14, threshold: 8, short: "IPX6 suya dayanıklı, 10 saat çalışma." },
  { name: "Çocuk Boyama Seti 48 Parça", category: "Anne & Çocuk", brand: "Aria", model: "BS-48", price: 159, cost: 55, stock: 180, short: "Yıkanabilir, toksik olmayan boyalar." },
  { name: "Ergonomik Ofis Yastığı", category: "Ev & Yaşam", brand: "Kuzey", model: "OY-3", price: 329, cost: 120, stock: 50, status: "taslak", short: "Hafızalı sünger, yıkanabilir kılıf." },
];

const customers = [
  { name: "Ayşe Demir", city: "İstanbul", district: "Kadıköy" },
  { name: "Mehmet Kaya", city: "Ankara", district: "Çankaya" },
  { name: "Zeynep Arslan", city: "İzmir", district: "Bornova" },
  { name: "Can Yılmaz", city: "Bursa", district: "Nilüfer" },
  { name: "Elif Şahin", city: "Antalya", district: "Muratpaşa" },
  { name: "Burak Çelik", city: "İstanbul", district: "Beşiktaş" },
  { name: "Merve Aydın", city: "Konya", district: "Selçuklu" },
  { name: "Ahmet Öztürk", city: "Adana", district: "Seyhan" },
  { name: "Selin Koç", city: "Eskişehir", district: "Tepebaşı" },
  { name: "Emre Polat", city: "İstanbul", district: "Üsküdar" },
  { name: "Derya Güneş", city: "Trabzon", district: "Ortahisar" },
  { name: "Onur Erdem", city: "Gaziantep", district: "Şahinbey" },
];

const carriers = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo"];
const payments = ["Kredi Kartı", "Kredi Kartı", "Banka Kartı", "Havale/EFT"];
/** Sipariş ağırlıklandırması: hızlı satan ürünler daha sık seçilir. */
const productPool = [0, 0, 1, 1, 1, 2, 2, 3, 4, 4, 5, 5, 5, 6, 7, 7, 8, 9, 9, 10];

function trackingNumber(random: () => number): string {
  return `VP${Math.floor(1_000_000_000 + random() * 8_999_999_999)}`;
}

/** Bugünden geriye 30 güne yayılan ~34 örnek sipariş için yaş (saat) listesi. */
function orderAges(random: () => number): number[] {
  const perDay = [4, 3, 2, 3, 1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1];
  const ages: number[] = [];
  perDay.forEach((count, day) => {
    for (let index = 0; index < count; index += 1) {
      const base = day === 0 ? 0.6 + index * 1.9 : day * 24 + 1.5 + random() * 20;
      ages.push(base);
    }
  });
  return ages.sort((a, b) => a - b);
}

function statusFor(ageHours: number, index: number): { status: DemoOrder["status"]; labeled: boolean; outForDelivery: boolean } {
  if (ageHours < 6) return { status: "alindi", labeled: false, outForDelivery: false };
  if (ageHours < 30) {
    const slot = index % 3;
    if (slot === 0) return { status: "alindi", labeled: false, outForDelivery: false };
    return { status: "hazirlaniyor", labeled: slot === 1, outForDelivery: false };
  }
  if (ageHours < 96) {
    // Her 5. sipariş hazırlama süresini aşmış (geciken) olarak kalır.
    if (index % 5 === 0) return { status: "hazirlaniyor", labeled: false, outForDelivery: false };
    return { status: "kargoda", labeled: true, outForDelivery: index % 2 === 0 };
  }
  if (ageHours < 240 && index % 6 === 0) return { status: "kargoda", labeled: true, outForDelivery: true };
  if (index % 11 === 0) return { status: "iptal-edildi", labeled: false, outForDelivery: false };
  return { status: "teslim-edildi", labeled: true, outForDelivery: true };
}

export function buildSampleData(input: { ownerId: string; storeName: string; now: Date }): SampleData {
  const { ownerId, storeName, now } = input;
  const random = mulberry32(20260920);
  const nowMs = now.getTime();
  const isoAgo = (hours: number) => new Date(nowMs - hours * HOUR_MS).toISOString();

  const products: SellerProduct[] = productSeeds.map((seed, index) => ({
    id: `${SAMPLE_PRODUCT_PREFIX}${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    sku: `ORN-${String(index + 1).padStart(3, "0")}`,
    category: seed.category,
    price: seed.price,
    cost: seed.cost,
    stock: seed.stock,
    status: seed.status ?? "aktif",
    brand: seed.brand,
    model: seed.model,
    shortDescription: seed.short,
    costs: seed.extras,
    criticalThreshold: seed.threshold,
    sample: true,
    createdAt: isoAgo(24 * 40 - index * 6),
  }));

  const orders: DemoOrder[] = [];
  const metas: Record<string, OrderMeta> = {};
  const ages = orderAges(random);

  ages.forEach((age, index) => {
    const id = `${SAMPLE_ORDER_PREFIX}${String(index + 1).padStart(4, "0")}`;
    const customer = customers[Math.floor(random() * customers.length)];
    const lineCount = random() < 0.28 ? 2 : 1;
    const used = new Set<number>();
    const items: DemoOrder["items"] = [];
    for (let line = 0; line < lineCount; line += 1) {
      const productIndex = productPool[Math.floor(random() * productPool.length)];
      if (used.has(productIndex)) continue;
      used.add(productIndex);
      const product = products[productIndex];
      items.push({ slug: `demo-${product.id}`, name: product.name, seller: storeName, ownerId, quantity: random() < 0.2 ? 2 : 1, price: product.price });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = subtotal >= 250 ? 0 : 49.9;
    // Tek sipariş bilinçli olarak eksik adresli: "Aksiyon Gerekiyor" uyarısını gösterir.
    const shortAddress = index === 5;
    const address = shortAddress ? customer.district : `${customer.district} Mah. Gül Sk. No:${10 + index}, ${customer.district} / ${customer.city}`;
    const { status, labeled, outForDelivery } = statusFor(age, index);
    const createdAt = isoAgo(age);

    orders.push({ id, buyerId: SAMPLE_BUYER_ID, createdAt, status, items, address, billingAddress: address, subtotal, discount: 0, shipping, total: Math.round((subtotal + shipping) * 100) / 100 });

    const events: OrderEvent[] = [{ key: "alindi", at: createdAt }];
    const step = (hoursAfter: number) => new Date(Math.min(nowMs, new Date(createdAt).getTime() + hoursAfter * HOUR_MS)).toISOString();
    if (status !== "alindi" && status !== "iptal-edildi") events.push({ key: "hazirlaniyor", at: step(2) });
    if (status === "kargoda" || status === "teslim-edildi") events.push({ key: "kargoda", at: step(20) });
    if (outForDelivery && (status === "kargoda" || status === "teslim-edildi")) events.push({ key: "dagitimda", at: step(44) });
    if (status === "teslim-edildi") events.push({ key: "teslim-edildi", at: step(60) });
    if (status === "iptal-edildi") events.push({ key: "iptal-edildi", at: step(3) });

    const shipped = status === "kargoda" || status === "teslim-edildi";
    metas[id] = {
      sample: true,
      carrier: carriers[index % carriers.length],
      paymentMethod: payments[index % payments.length],
      labelCreated: labeled,
      labelPrinted: labeled,
      outForDelivery: outForDelivery && shipped,
      tracking: shipped ? trackingNumber(random) : undefined,
      customer: {
        name: customer.name,
        phone: `0555 ${String(100 + index * 7).padStart(3, "0")} ${String(10 + index).padStart(2, "0")} ${String(20 + index * 3).slice(-2)}`,
        email: `musteri${index + 1}@ornek.test`,
        city: customer.city,
      },
      events,
    };
  });

  const movements: StockMovement[] = [
    { id: `${SAMPLE_MOVEMENT_PREFIX}1`, productId: products[2].id, delta: 50, reason: "Tedarikçi girişi", at: isoAgo(3) },
    { id: `${SAMPLE_MOVEMENT_PREFIX}2`, productId: products[6].id, delta: -2, reason: "Sayım düzeltmesi", at: isoAgo(5) },
    { id: `${SAMPLE_MOVEMENT_PREFIX}3`, productId: products[9].id, delta: 20, reason: "Tedarikçi girişi", at: isoAgo(30) },
  ];

  const questions: SellerQuestion[] = [
    { id: `${SAMPLE_QUESTION_PREFIX}1`, sellerName: storeName, productSlug: `demo-${products[0].id}`, productName: products[0].name, customerName: "Ayşe D.", question: "Kulaklık iPhone ile sorunsuz eşleşiyor mu? Faturalı mı gönderiliyor?", createdAt: isoAgo(2), status: "bekliyor", sample: true },
    { id: `${SAMPLE_QUESTION_PREFIX}2`, sellerName: storeName, productSlug: `demo-${products[4].id}`, productName: products[4].name, customerName: "Mehmet K.", question: "32 beden kot için bel ölçüsü kaç cm?", createdAt: isoAgo(9), status: "bekliyor", sample: true },
    { id: `${SAMPLE_QUESTION_PREFIX}3`, sellerName: storeName, productSlug: `demo-${products[7].id}`, productName: products[7].name, customerName: "Zeynep A.", question: "Ayakkabı 42 numara normal kalıp mı, yarım numara büyük mü almalıyım?", createdAt: isoAgo(27), status: "bekliyor", sample: true },
    { id: `${SAMPLE_QUESTION_PREFIX}4`, sellerName: storeName, productSlug: `demo-${products[9].id}`, productName: products[9].name, customerName: "Can Y.", question: "Hoparlör aynı anda iki telefona bağlanabiliyor mu?", createdAt: isoAgo(50), status: "yanitlandi", answer: "Merhaba, aynı anda tek cihaza bağlanır; eşleşme listesinde 8 cihaz saklar.", answeredAt: isoAgo(46), sample: true },
  ];

  return { products, orders, metas, movements, questions };
}
