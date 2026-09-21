"use client";

import Link from "next/link";
import { FileUp, Megaphone, PackagePlus, Rocket, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import { NotificationPanel } from "@/components/dashboard/NotificationPanel";
import { QuickActions, type QuickAction } from "@/components/dashboard/QuickActions";
import { UpgradeSuggestionCard } from "@/components/dashboard/UpgradeLock";
import { hasFeature, suggestUpgrade } from "@/lib/plans";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { useSampleData } from "@/components/seller/useSampleData";
import { AdPerformanceCard } from "@/components/seller/overview/AdPerformanceCard";
import { AiSuggestionsCard } from "@/components/seller/overview/AiSuggestionsCard";
import { EarningsCard } from "@/components/seller/overview/EarningsCard";
import { OverviewKpis } from "@/components/seller/overview/OverviewKpis";
import { RecentOrdersCard } from "@/components/seller/overview/RecentOrdersCard";
import { SalesChartCard } from "@/components/seller/overview/SalesChartCard";
import { StoreHealthCard } from "@/components/seller/overview/StoreHealthCard";
import { TodoCard } from "@/components/seller/overview/TodoCard";

const DAY_MS = 86_400_000;

function EmptyShopBanner({ onLoadSample }: { onLoadSample?: () => void }) {
  return (
    <Panel className="mb-5 flex flex-wrap items-center gap-4 border-royal-100 bg-gradient-to-r from-royal-50 via-white to-white">
      <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-royal-600 text-white shadow-royal">
        <Sparkles size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-extrabold text-navy-900">Mağazan hazır, şimdi ürünlerini ekle</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {onLoadSample ? "Paneli hemen denemek için demo örnek veri yükleyebilir ya da ilk ürününü kendin ekleyebilirsin. Örnek veri istediğin an tek tıkla kaldırılır." : "İlk ürününü ekleyerek satışa başlayabilirsin. Ürünlerin yayına alındığında müşteriler mağazanı görür."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onLoadSample ? (
          <ActionButton variant="primary" onClick={onLoadSample}>
            Örnek Veri Yükle
          </ActionButton>
        ) : null}
        <Link href={sellerHref.newProduct} className={linkButtonClass(onLoadSample ? "secondary" : "primary")}>
          İlk Ürünümü Ekle
        </Link>
      </div>
    </Panel>
  );
}

export function OverviewPage() {
  const { owner, shop, products, rows, planKey, ops, now, notifications, readIds, markNotificationsRead } = useSellerWorkspace();
  const sample = useSampleData();
  const firstName = owner.name.trim().split(/\s+/)[0] || "Satıcı";
  const isEmpty = products.length === 0 && rows.length === 0;

  const suggestion = useMemo(() => {
    const since = now.getTime() - 30 * DAY_MS;
    return suggestUpgrade({
      planKey,
      productCount: products.length,
      capacityAddOnKey: ops.capacityRequest,
      campaignCount: shop.campaigns.length,
      monthlyOrderCount: rows.filter((row) => row.createdAt.getTime() >= since).length,
    });
  }, [planKey, products.length, ops.capacityRequest, shop.campaigns.length, rows, now]);

  const quickActions: QuickAction[] = [
    { key: "new-product", icon: PackagePlus, tone: "violet", title: "Yeni Ürün Ekle", subtitle: "Ürününü mağazana ekle", href: sellerHref.newProduct },
    { key: "bulk", icon: FileUp, tone: "blue", title: "Toplu Yükleme", subtitle: "Excel/CSV ile ürün yükle", href: `${sellerHref.products}?toplu=1`, locked: !hasFeature(planKey, "csvImport") },
    { key: "campaign", icon: Megaphone, tone: "rose", title: "Kampanya Oluştur", subtitle: "İndirim ve fırsat ekle", href: sellerHref.campaigns },
    { key: "ad", icon: Rocket, tone: "teal", title: "Reklam Oluştur", subtitle: "Ürününü öne çıkar", href: sellerHref.ads },
  ];

  const today = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

  return (
    <>
      <PageHeader
        title={`Merhaba ${firstName},`}
        description={isEmpty ? "Mağazan henüz boş; başlamak için ürün ekle." : "Mağazanın bugünkü durumu burada."}
        actions={
          <>
            <span className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-navy-600">{today}</span>
            {sample.loaded ? (
              <ActionButton variant="secondary" size="sm" onClick={sample.remove}>
                Örnek Veriyi Kaldır
              </ActionButton>
            ) : null}
          </>
        }
      />

      {isEmpty ? <EmptyShopBanner onLoadSample={sample.available ? sample.load : undefined} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <OverviewKpis />
          <div className="grid gap-5 xl:grid-cols-5">
            <div className="min-w-0 xl:col-span-3">
              <SalesChartCard />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <TodoCard />
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <EarningsCard />
            <StoreHealthCard />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <RecentOrdersCard />
            <AdPerformanceCard />
          </div>
        </div>

        <aside aria-label="Yan panel" className="flex min-w-0 flex-col gap-5">
          <NotificationPanel items={notifications} now={now} readIds={readIds} moreHref={sellerHref.orders} onSelect={(item) => markNotificationsRead([item.id])} />
          <QuickActions actions={quickActions} />
          {suggestion ? <UpgradeSuggestionCard suggestion={suggestion} /> : null}
          <AiSuggestionsCard />
        </aside>
      </div>
    </>
  );
}
