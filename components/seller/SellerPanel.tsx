"use client";

import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Boxes,
  Megaphone,
  Rocket,
  BarChart3,
  Settings,
  Wallet,
  Eye,
  TrendingUp,
  Star,
  Plus,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

type TabKey =
  | "genel-bakis"
  | "urunler"
  | "siparisler"
  | "stok"
  | "kampanyalar"
  | "reklamlar"
  | "analitik"
  | "ayarlar";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "genel-bakis", label: "Genel Bakış", icon: LayoutDashboard },
  { key: "urunler", label: "Ürünler", icon: Package },
  { key: "siparisler", label: "Siparişler", icon: ClipboardList },
  { key: "stok", label: "Stok", icon: Boxes },
  { key: "kampanyalar", label: "Kampanyalar", icon: Megaphone },
  { key: "reklamlar", label: "Reklamlar", icon: Rocket },
  { key: "analitik", label: "Analitik", icon: BarChart3 },
  { key: "ayarlar", label: "Mağaza Ayarları", icon: Settings },
];

const metrics = [
  { icon: Wallet, label: "Bugünkü Satış", value: "18.420 TL", change: "+%12" },
  { icon: ClipboardList, label: "Sipariş Sayısı", value: "47", change: "+%8" },
  { icon: Eye, label: "Görüntülenme", value: "6.230", change: "+%21" },
  { icon: TrendingUp, label: "Dönüşüm Oranı", value: "%3,4", change: "+%0,6" },
];

const bestSellers = [
  { name: "GamePower Warlock Oyuncu Bilgisayarı", sold: 128, revenue: 1919872 },
  { name: "Sony WH-1000XM5 Kablosuz Kulaklık", sold: 94, revenue: 845906 },
  { name: "Apple Watch Series 9 45mm", sold: 71, revenue: 922429 },
];

const recentOrders = [
  { id: "PB-48213", customer: "Elif Y.", amount: 2699, status: "Hazırlanıyor" },
  { id: "PB-48212", customer: "Mert K.", amount: 14999, status: "Kargoya Verildi" },
  { id: "PB-48211", customer: "Zeynep A.", amount: 8999, status: "Teslim Edildi" },
  { id: "PB-48210", customer: "Burak S.", amount: 12999, status: "Hazırlanıyor" },
];

const inventory = [
  { name: "GamePower Warlock Oyuncu Bilgisayarı", stock: 42, status: "Stokta" },
  { name: "Sony WH-1000XM5 Kablosuz Kulaklık", stock: 6, status: "Az Kaldı" },
  { name: "Apple Watch Series 9 45mm", stock: 0, status: "Tükendi" },
  { name: "Samsung Galaxy Tab S9 128GB", stock: 18, status: "Stokta" },
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
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[status])}>
      {status}
    </span>
  );
}

function MetricsGrid() {
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

function DemoButton({ label, icon: Icon }: { label: string; icon?: typeof Plus }) {
  return (
    <button
      type="button"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
    >
      {Icon ? <Icon size={13} /> : null}
      {label}
    </button>
  );
}

export function SellerPanel() {
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
        {active === "genel-bakis" ? (
          <div className="flex flex-col gap-5">
            <MetricsGrid />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title="En Çok Satan Ürünler">
                <ul className="flex flex-col gap-3">
                  {bestSellers.map((item, index) => (
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
                <ul className="flex flex-col divide-y divide-navy-50">
                  {recentOrders.map((order) => (
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
        ) : null}

        {active === "urunler" ? (
          <Card title="Ürünlerim" action={<DemoButton label="AI ile Ürün Ekle" icon={Plus} />}>
            <ul className="flex flex-col divide-y divide-navy-50">
              {inventory.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate text-sm font-medium text-navy-800">{item.name}</span>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {active === "siparisler" ? (
          <Card title="Tüm Siparişler">
            <ul className="flex flex-col divide-y divide-navy-50">
              {recentOrders.map((order) => (
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
          </Card>
        ) : null}

        {active === "stok" ? (
          <Card title="Stok Durumu">
            <ul className="flex flex-col divide-y divide-navy-50">
              {inventory.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate text-sm font-medium text-navy-800">{item.name}</span>
                  <span className="shrink-0 text-sm text-navy-500">{item.stock} adet</span>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {active === "kampanyalar" ? (
          <Card title="Mağaza Kampanyaların" action={<DemoButton label="Kampanya Oluştur" icon={Plus} />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-navy-50/60 p-4">
                <p className="text-sm font-bold text-navy-800">Hafta Sonu Fırsatı</p>
                <p className="mt-1 text-xs text-navy-400">Seçili 12 üründe %15 indirim · 3 gün kaldı</p>
              </div>
              <div className="rounded-xl bg-navy-50/60 p-4">
                <p className="text-sm font-bold text-navy-800">2 Al 1 Öde</p>
                <p className="mt-1 text-xs text-navy-400">Aksesuar kategorisinde aktif</p>
              </div>
            </div>
          </Card>
        ) : null}

        {active === "reklamlar" ? (
          <Card title="Reklam Performansı" action={<DemoButton label="Yeni Reklam Oluştur" icon={Plus} />}>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {[
                { label: "Harcama", value: "1.240 TL" },
                { label: "Gösterim", value: "48.900" },
                { label: "Tıklama", value: "2.310" },
                { label: "ROAS", value: "5,2x" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-navy-50/60 p-3.5 text-center">
                  <p className="text-base font-extrabold text-navy-900">{stat.value}</p>
                  <p className="text-[11px] text-navy-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {active === "analitik" ? (
          <div className="flex flex-col gap-5">
            <MetricsGrid />
            <Card title="Müşteri Memnuniyeti">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-2xl font-extrabold text-navy-900">
                  4.8 <Star size={18} className="fill-amber-400 text-amber-400" />
                </span>
                <span className="text-xs text-navy-400">Son 90 günde 640 değerlendirmeye göre</span>
              </div>
            </Card>
          </div>
        ) : null}

        {active === "ayarlar" ? (
          <Card title="Mağaza Ayarları" action={<DemoButton label="Kaydet" />}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {[
                { label: "Mağaza Adı", value: "TeknoMarket" },
                { label: "Paket", value: "Pro · 999 TL/ay" },
                { label: "İletişim E-posta", value: "magaza@teknomarket.com" },
                { label: "Kargo Süresi", value: "1-2 iş günü" },
              ].map((field) => (
                <div key={field.label}>
                  <p className="mb-1 text-xs font-semibold text-navy-500">{field.label}</p>
                  <p className="rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 text-sm text-navy-700">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
