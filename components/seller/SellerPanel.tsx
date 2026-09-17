"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Boxes,
  Megaphone,
  Rocket,
  Truck,
  BarChart3,
  Settings,
  Wallet,
  Eye,
  TrendingUp,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import {
  SellerDataProvider,
  useSellerData,
  type SellerProduct,
} from "@/components/seller/SellerDataProvider";
import { SellerProductForm } from "@/components/seller/SellerProductForm";
import { SellerComingSoon } from "@/components/seller/SellerComingSoon";

type TabKey =
  | "genel-bakis"
  | "siparisler"
  | "urunler"
  | "stok"
  | "kar-analizi"
  | "finans"
  | "kampanyalar"
  | "reklamlar"
  | "kargo"
  | "raporlar"
  | "ayarlar";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "genel-bakis", label: "Genel Bakış", icon: LayoutDashboard },
  { key: "siparisler", label: "Siparişler", icon: ClipboardList },
  { key: "urunler", label: "Ürünler", icon: Package },
  { key: "stok", label: "Stok", icon: Boxes },
  { key: "kar-analizi", label: "Kâr Analizi", icon: TrendingUp },
  { key: "finans", label: "Finans", icon: Wallet },
  { key: "kampanyalar", label: "Kampanyalar", icon: Megaphone },
  { key: "reklamlar", label: "Reklamlar", icon: Rocket },
  { key: "kargo", label: "Kargo", icon: Truck },
  { key: "raporlar", label: "Raporlar", icon: BarChart3 },
  { key: "ayarlar", label: "Mağaza Ayarları", icon: Settings },
];

// Gerçek bir sipariş/ödeme altyapısı bu ortamda bağlı olmadığından, satış ve
// sipariş verileri açıkça "örnek veri" olarak işaretlenir — hiçbir yerde
// gerçek kullanıcı/finansal veri gibi sunulmaz (madde 6'nın açık şartı).
const sampleMetrics = [
  { icon: Wallet, label: "Bugünkü Satış", value: "18.420 TL", change: "+%12" },
  { icon: ClipboardList, label: "Sipariş Sayısı", value: "47", change: "+%8" },
  { icon: Eye, label: "Görüntülenme", value: "6.230", change: "+%21" },
  { icon: TrendingUp, label: "Dönüşüm Oranı", value: "%3,4", change: "+%0,6" },
];

const sampleBestSellers = [
  { name: "GamePower Warlock Oyuncu Bilgisayarı", sold: 128, revenue: 1919872 },
  { name: "Sony WH-1000XM5 Kablosuz Kulaklık", sold: 94, revenue: 845906 },
  { name: "Apple Watch Series 9 45mm", sold: 71, revenue: 922429 },
];

type SampleOrder = { id: string; customer: string; amount: number; status: string };

const sampleOrders: SampleOrder[] = [
  { id: "VP-48213", customer: "Elif Y.", amount: 2699, status: "Hazırlanıyor" },
  { id: "VP-48212", customer: "Mert K.", amount: 14999, status: "Kargoya Verildi" },
  { id: "VP-48211", customer: "Zeynep A.", amount: 8999, status: "Teslim Edildi" },
  { id: "VP-48210", customer: "Burak S.", amount: 12999, status: "Hazırlanıyor" },
  { id: "VP-48209", customer: "Aylin T.", amount: 4599, status: "Kargoya Verildi" },
  { id: "VP-48208", customer: "Ozan D.", amount: 999, status: "Teslim Edildi" },
];

const statusTone: Record<string, string> = {
  Hazırlanıyor: "bg-amber-50 text-amber-700",
  "Kargoya Verildi": "bg-sky-50 text-sky-700",
  "Teslim Edildi": "bg-emerald-50 text-emerald-700",
  Stokta: "bg-emerald-50 text-emerald-700",
  "Az Kaldı": "bg-amber-50 text-amber-700",
  Tükendi: "bg-rose-50 text-rose-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[status])}>
      {status}
    </span>
  );
}

function SampleDataNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-1.5 rounded-xl bg-navy-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-navy-500">
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-navy-400" />
      {children}
    </p>
  );
}

function stockStatus(stock: number): string {
  if (stock <= 0) return "Tükendi";
  if (stock <= 10) return "Az Kaldı";
  return "Stokta";
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-100/80 bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-navy-900">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
}: {
  label: string;
  icon?: typeof Plus;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600",
        variant === "ghost" && "bg-navy-50 text-navy-600 hover:bg-navy-100",
        variant === "danger" && "bg-rose-50 text-rose-600 hover:bg-rose-100"
      )}
    >
      {Icon ? <Icon size={13} /> : null}
      {label}
    </button>
  );
}

function MetricsGrid({ metrics }: { metrics: typeof sampleMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-navy-100/80 bg-white p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <metric.icon size={17} />
          </span>
          <p className="mt-3 text-lg font-extrabold text-navy-900">{metric.value}</p>
          <p className="text-xs text-navy-400">{metric.label}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">{metric.change} bu hafta</p>
        </div>
      ))}
    </div>
  );
}

function GenelBakisTab() {
  const { products } = useSellerData();

  const inventoryMetrics = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    return [
      { icon: Package, label: "Toplam Ürün", value: String(products.length), change: "gerçek" },
      { icon: Boxes, label: "Toplam Stok", value: `${totalStock} adet`, change: "gerçek" },
      { icon: AlertTriangle, label: "Az Stoklu Ürün", value: String(lowStock), change: "gerçek" },
      { icon: Wallet, label: "Envanter Değeri", value: formatPrice(inventoryValue), change: "gerçek" },
    ];
  }, [products]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-navy-400">
          Ürün Kataloğundan Gerçek Zamanlı Veriler
        </p>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {inventoryMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-navy-100/80 bg-white p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <metric.icon size={17} />
              </span>
              <p className="mt-3 text-lg font-extrabold text-navy-900">{metric.value}</p>
              <p className="text-xs text-navy-400">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-navy-400">Örnek Satış Verileri</p>
        <MetricsGrid metrics={sampleMetrics} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="En Çok Satan Ürünler">
          <SampleDataNote>
            Örnek veridir — gerçek satış geçmişi için sipariş/ödeme entegrasyonu gerekir.
          </SampleDataNote>
          <ul className="flex flex-col gap-3">
            {sampleBestSellers.map((item, index) => (
              <li key={item.name} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-600">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy-800">{item.name}</span>
                  <span className="block text-xs text-navy-400">{item.sold} satış</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-navy-900">{formatPrice(item.revenue)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Son Siparişler">
          <SampleDataNote>
            Örnek veridir — gerçek zamanlı siparişler için sipariş altyapısı entegrasyonu gerekir.
          </SampleDataNote>
          <ul className="flex flex-col divide-y divide-navy-50">
            {sampleOrders.slice(0, 4).map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy-800">{order.id}</span>
                  <span className="block text-xs text-navy-400">{order.customer}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-navy-900">{formatPrice(order.amount)}</span>
                <StatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

const ORDER_FILTERS = ["Tümü", "Hazırlanıyor", "Kargoya Verildi", "Teslim Edildi"] as const;

function SiparislerTab() {
  const [filter, setFilter] = useState<(typeof ORDER_FILTERS)[number]>("Tümü");
  const filtered = filter === "Tümü" ? sampleOrders : sampleOrders.filter((o) => o.status === filter);

  return (
    <Card title="Tüm Siparişler">
      <SampleDataNote>
        Bu liste örnek sipariş verisidir — gerçek siparişlerin akması için ödeme ve lojistik altyapısı entegrasyonu
        gerekir. Filtre aşağıda gerçek şekilde çalışır.
      </SampleDataNote>

      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === status ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-navy-400">Bu durumda sipariş bulunmuyor.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-navy-50">
          {filtered.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy-800">{order.id}</span>
                <span className="block text-xs text-navy-400">{order.customer}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-navy-900">{formatPrice(order.amount)}</span>
              <StatusBadge status={order.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function UrunlerTab() {
  const { products, addProduct, updateProduct, deleteProduct } = useSellerData();
  const [formMode, setFormMode] = useState<"closed" | "add" | string>("closed");

  const editingProduct = typeof formMode === "string" && formMode !== "closed" && formMode !== "add"
    ? products.find((p) => p.id === formMode) ?? null
    : null;

  function handleSubmit(values: Omit<SellerProduct, "id">) {
    if (formMode === "add") {
      addProduct(values);
    } else if (editingProduct) {
      updateProduct(editingProduct.id, values);
    }
    setFormMode("closed");
  }

  function handleDelete(id: string, name: string) {
    if (typeof window !== "undefined" && !window.confirm(`"${name}" ürününü silmek istediğine emin misin?`)) return;
    deleteProduct(id);
  }

  return (
    <Card
      title="Ürünlerim"
      action={
        formMode === "closed" ? (
          <ActionButton label="Ürün Ekle" icon={Plus} onClick={() => setFormMode("add")} />
        ) : null
      }
    >
      {formMode === "add" ? (
        <SellerProductForm onCancel={() => setFormMode("closed")} onSubmit={handleSubmit} />
      ) : null}

      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-navy-400">Henüz ürün eklemedin. Yukarıdan ilk ürününü ekle.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-navy-50">
          {products.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              {editingProduct?.id === item.id ? (
                <SellerProductForm product={item} onCancel={() => setFormMode("closed")} onSubmit={handleSubmit} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-800">{item.name}</p>
                    <p className="text-xs text-navy-400">
                      {item.sku} · {item.category} · {formatPrice(item.price)}
                    </p>
                  </div>
                  <StatusBadge status={stockStatus(item.stock)} />
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionButton label="Düzenle" variant="ghost" onClick={() => setFormMode(item.id)} />
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      aria-label={`${item.name} ürününü sil`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StokTab() {
  const { products, updateProduct } = useSellerData();

  return (
    <Card title="Stok Durumu">
      <p className="mb-4 text-[11px] text-navy-400">
        Stok adetleri gerçek zamanlı düzenlenebilir — değişiklik anında kaydedilir.
      </p>
      <ul className="flex flex-col divide-y divide-navy-50">
        {products.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-800">{item.name}</span>
            <input
              type="number"
              min={0}
              value={item.stock}
              onChange={(e) => updateProduct(item.id, { stock: Math.max(0, Number(e.target.value) || 0) })}
              className="w-20 shrink-0 rounded-xl border border-navy-100 bg-navy-50/40 px-2.5 py-1.5 text-center text-sm font-semibold text-navy-800 focus:border-brand-300 focus:outline-none"
            />
            <StatusBadge status={stockStatus(item.stock)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function KarAnaliziTab() {
  const { products, updateProduct } = useSellerData();

  const totals = useMemo(() => {
    const potentialProfit = products.reduce((sum, p) => sum + Math.max(0, p.price - p.cost) * p.stock, 0);
    const margins = products.filter((p) => p.price > 0).map((p) => ((p.price - p.cost) / p.price) * 100);
    const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    return { potentialProfit, avgMargin };
  }, [products]);

  return (
    <Card title="Kâr Analizi">
      <p className="mb-4 text-[11px] text-navy-400">
        Maliyeti girdiğin her ürün için kâr, kâr marjı ve mevcut stoğa göre potansiyel kâr otomatik hesaplanır.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold text-emerald-700">Toplam Potansiyel Kâr (mevcut stok)</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-800">{formatPrice(totals.potentialProfit)}</p>
        </div>
        <div className="rounded-xl bg-navy-50/60 p-4">
          <p className="text-xs font-semibold text-navy-600">Ortalama Kâr Marjı</p>
          <p className="mt-1 text-xl font-extrabold text-navy-900">%{totals.avgMargin.toFixed(1)}</p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-navy-50">
        {products.map((item) => {
          const profit = item.price - item.cost;
          const marginPct = item.price > 0 ? (profit / item.price) * 100 : 0;
          const potential = profit * item.stock;
          return (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-800">{item.name}</span>
              <span className="shrink-0 text-xs text-navy-400">{formatPrice(item.price)}</span>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-navy-500">
                Maliyet
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.cost}
                  onChange={(e) => updateProduct(item.id, { cost: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20 rounded-lg border border-navy-100 bg-navy-50/40 px-2 py-1 text-right text-xs font-semibold text-navy-800 focus:border-brand-300 focus:outline-none"
                />
              </label>
              <span
                className={cn(
                  "shrink-0 text-xs font-bold",
                  profit >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                %{marginPct.toFixed(1)} kâr
              </span>
              <span className="shrink-0 text-sm font-bold text-navy-900">{formatPrice(potential)}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function FinansTab() {
  const { products } = useSellerData();
  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + p.price * p.stock, 0), [products]);
  const avgMargin = useMemo(() => {
    const margins = products.filter((p) => p.price > 0).map((p) => ((p.price - p.cost) / p.price) * 100);
    return margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  }, [products]);

  return (
    <div className="flex flex-col gap-5">
      <Card title="Envanter Finans Özeti (ürün kataloğundan gerçek zamanlı hesaplanır)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-navy-50/60 p-4">
            <p className="text-xs font-semibold text-navy-600">Toplam Envanter Değeri</p>
            <p className="mt-1 text-xl font-extrabold text-navy-900">{formatPrice(inventoryValue)}</p>
          </div>
          <div className="rounded-xl bg-navy-50/60 p-4">
            <p className="text-xs font-semibold text-navy-600">Ortalama Kâr Marjı</p>
            <p className="mt-1 text-xl font-extrabold text-navy-900">%{avgMargin.toFixed(1)}</p>
          </div>
        </div>
      </Card>

      <Card title="Ödeme ve Cüzdan">
        <SellerComingSoon
          title="Ödeme Aktarımı ve Cüzdan Takibi"
          description="Banka hesabına ödeme aktarımı ve gerçek zamanlı cüzdan bakiyesi, ödeme altyapısı (banka/ödeme kuruluşu) entegrasyonu tamamlandığında burada gösterilecek. Şu an sahte bir bakiye gösterilmiyor."
        />
      </Card>
    </div>
  );
}

function KampanyalarTab() {
  const { campaigns, addCampaign, deleteCampaign } = useSellerData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("10");
  const [endDate, setEndDate] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const discountPercent = Math.min(90, Math.max(1, Number(discount) || 0));
    if (!name.trim() || !endDate) return;
    addCampaign({ name: name.trim(), discountPercent, endDate });
    setName("");
    setDiscount("10");
    setEndDate("");
    setOpen(false);
  }

  return (
    <Card
      title="Mağaza Kampanyaların"
      action={!open ? <ActionButton label="Kampanya Oluştur" icon={Plus} onClick={() => setOpen(true)} /> : null}
    >
      {open ? (
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/30 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs font-semibold text-navy-600">
            Kampanya Adı
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
          <label className="flex w-24 flex-col gap-1 text-xs font-semibold text-navy-600">
            İndirim %
            <input
              type="number"
              min={1}
              max={90}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
            Bitiş Tarihi
            <input
              required
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600">
              Oluştur
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-xs font-semibold text-navy-500 hover:bg-navy-100/60">
              Vazgeç
            </button>
          </div>
        </form>
      ) : null}

      {campaigns.length === 0 ? (
        <p className="py-6 text-center text-sm text-navy-400">Henüz bir kampanyan yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-start justify-between gap-2 rounded-xl bg-navy-50/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-navy-800">{campaign.name}</p>
                <p className="mt-1 text-xs text-navy-400">
                  %{campaign.discountPercent} indirim · {campaign.endDate} tarihine kadar
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteCampaign(campaign.id)}
                aria-label={`${campaign.name} kampanyasını sil`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReklamlarTab() {
  return (
    <Card title="Reklam ve Öne Çıkarma">
      <SellerComingSoon
        title="Reklam Araçları"
        description="Ürünlerini VitrinPlus içinde öne çıkarma ve reklam kampanyası oluşturma araçları yakında aktif olacak. Şu an gerçek olmayan performans rakamları gösterilmiyor."
      />
    </Card>
  );
}

function KargoTab() {
  const { shipping, updateShipping } = useSellerData();
  const [form, setForm] = useState(shipping);
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateShipping(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card title="Kargo Ayarları" action={saved ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} /> Kaydedildi</span> : null}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Kargo Ücreti (TL)
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.shippingFee}
            onChange={(e) => setForm((prev) => ({ ...prev, shippingFee: Number(e.target.value) || 0 }))}
            className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Ücretsiz Kargo Eşiği (TL)
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.freeShippingThreshold}
            onChange={(e) => setForm((prev) => ({ ...prev, freeShippingThreshold: Number(e.target.value) || 0 }))}
            className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Hazırlama Süresi (gün)
          <input
            type="number"
            min={0}
            value={form.preparationDays}
            onChange={(e) => setForm((prev) => ({ ...prev, preparationDays: Number(e.target.value) || 0 }))}
            className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Kargo Firması
          <input
            value={form.carrier}
            onChange={(e) => setForm((prev) => ({ ...prev, carrier: e.target.value }))}
            className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600">
            Kaydet
          </button>
        </div>
      </form>
    </Card>
  );
}

function RaporlarTab() {
  const { products } = useSellerData();
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="flex flex-col gap-5">
      <Card title="Envanter Özeti (gerçek zamanlı)">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {[
            { label: "Ürün Sayısı", value: String(products.length) },
            { label: "Toplam Stok", value: `${totalStock} adet` },
            { label: "Az Stoklu / Tükenen", value: `${lowStock} / ${outOfStock}` },
            { label: "Envanter Değeri", value: formatPrice(inventoryValue) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-navy-50/60 p-3.5 text-center">
              <p className="text-base font-extrabold text-navy-900">{stat.value}</p>
              <p className="text-[11px] text-navy-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Satış ve Gelir Raporları">
        <SellerComingSoon
          title="Satış ve Gelir Raporları"
          description="Dönemsel satış, gelir ve iade raporları; sipariş geçmişi backend entegrasyonu tamamlandığında burada gerçek verilerle sunulacak."
        />
      </Card>
    </div>
  );
}

function AyarlarTab() {
  const { settings, updateSettings } = useSellerData();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card
      title="Mağaza Ayarları"
      action={saved ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14} /> Kaydedildi</span> : null}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
            Mağaza Adı
            <input
              value={form.storeName}
              onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))}
              className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
          <div>
            <p className="mb-1 text-xs font-semibold text-navy-500">Paket</p>
            <p className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-700">
              Pro · 999 TL/ay
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
            İletişim E-postası
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
            İletişim Telefonu
            <input
              value={form.contactPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Mağaza Açıklaması
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
        <div>
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-600">
            Kaydet
          </button>
        </div>
      </form>
    </Card>
  );
}

function SellerPanelContent() {
  const [active, setActive] = useState<TabKey>("genel-bakis");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-60">
        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-navy-100/80 bg-white p-1.5 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:overflow-visible">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                active === tab.key ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"
              )}
            >
              <tab.icon size={16} className="shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {active === "genel-bakis" ? <GenelBakisTab /> : null}
        {active === "siparisler" ? <SiparislerTab /> : null}
        {active === "urunler" ? <UrunlerTab /> : null}
        {active === "stok" ? <StokTab /> : null}
        {active === "kar-analizi" ? <KarAnaliziTab /> : null}
        {active === "finans" ? <FinansTab /> : null}
        {active === "kampanyalar" ? <KampanyalarTab /> : null}
        {active === "reklamlar" ? <ReklamlarTab /> : null}
        {active === "kargo" ? <KargoTab /> : null}
        {active === "raporlar" ? <RaporlarTab /> : null}
        {active === "ayarlar" ? <AyarlarTab /> : null}
      </div>
    </div>
  );
}

export function SellerPanel() {
  return (
    <SellerDataProvider>
      <SellerPanelContent />
    </SellerDataProvider>
  );
}
