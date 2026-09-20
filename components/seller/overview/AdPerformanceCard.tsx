"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { useMemo } from "react";
import { MetricCard } from "@/components/dashboard/StatCard";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { linkButtonClass } from "@/components/dashboard/form";
import { formatInteger, formatTL } from "@/lib/format";
import { buildProductPerformance } from "@/lib/seller-analytics";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

/**
 * Reklam & Vitrin performansı. Reklam sistemi sonraki aşamadadır; bu yüzden
 * gösterim/tıklama/satış değerleri UYDURULMAZ, "—" gösterilir. Yalnızca gerçek
 * sipariş verisinden hesaplanan "en çok satan ürün" bilgisi gösterilir.
 */
export function AdPerformanceCard() {
  const { products, rows } = useSellerWorkspace();
  const top = useMemo(() => buildProductPerformance(products, rows).filter((item) => item.sold > 0).sort((a, b) => b.revenue - a.revenue)[0], [products, rows]);

  return (
    <Panel aria-label="Reklam ve vitrin performansı" className="min-w-0">
      <PanelHeader
        title="Reklam & Vitrin Performansı"
        action={
          <Link href={sellerHref.ads} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
            Tümünü Gör <ArrowRight size={13} aria-hidden />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricCard label="Gösterim" value="—" />
        <MetricCard label="Tıklama" value="—" />
        <MetricCard label="Reklamdan Satış" value="—" />
        <MetricCard label="Reklam Cirosu" value="—" />
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">Aktif reklamın yok; reklam verdiğinde performans değerleri burada görünür.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted">En çok satan ürün</p>
          {top ? (
            <p className="truncate text-[13px] font-bold text-navy-900">
              {top.product.name} <span className="font-medium text-muted">· {formatInteger(top.sold)} satış · {formatTL(top.revenue)}</span>
            </p>
          ) : (
            <p className="text-[13px] font-semibold text-navy-400">Henüz satış yok</p>
          )}
        </div>
        <Link href={sellerHref.ads} className={linkButtonClass("primary", "sm")}>
          <Rocket size={13} aria-hidden /> Yeni Reklam Oluştur
        </Link>
      </div>
    </Panel>
  );
}
