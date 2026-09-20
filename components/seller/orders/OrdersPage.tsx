"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Boxes, CheckCircle2, ChevronDown, Eye, FileDown, Filter, PackageCheck, PackageSearch, Printer, Tag, Truck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { DropdownMenu, type MenuItem } from "@/components/dashboard/DropdownMenu";
import { HeaderPopover } from "@/components/dashboard/DashboardHeader";
import { drawerOffsetClass } from "@/components/dashboard/DetailDrawer";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FilterBar, SearchFilter, SelectFilter } from "@/components/dashboard/FilterBar";
import { ConfirmModal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Pagination, paginate } from "@/components/dashboard/Pagination";
import { Panel } from "@/components/dashboard/Panel";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import { cn } from "@/lib/utils";
import { downloadTextFile, toCsv } from "@/lib/csv";
import { orderUiLabels, buildActionAlerts, type SellerOrderRow } from "@/lib/seller-analytics";
import {
  activeFilterCount,
  filterOrders,
  isWaiting,
  noOrderFilters,
  orderStatusFilters,
  parseAlertFilter,
  parseStatusFilter,
  uniqueSorted,
  type OrderAlertFilter,
  type OrderFilters,
} from "@/lib/seller-orders";
import { useSampleData } from "@/components/seller/useSampleData";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";
import { ActionNeededPanel } from "@/components/seller/orders/ActionNeededPanel";
import { LabelModal } from "@/components/seller/orders/LabelModal";
import { OrderDrawer } from "@/components/seller/orders/OrderDrawer";
import { OrderStatusCards } from "@/components/seller/orders/OrderStatusCards";
import { OrderTable } from "@/components/seller/orders/OrderTable";
import { useOrderActions } from "@/components/seller/orders/useOrderActions";

const alertOptions: { value: OrderAlertFilter; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "hepsi", label: "Aksiyon gerektirenlerin hepsi" },
  { value: "adres", label: "Adres bilgisi eksik" },
  { value: "geciken", label: "Kargo süresi geçmiş" },
  { value: "stok", label: "Stok sorunu olan" },
];

const menuButton =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-navy-700 hover:border-royal-200 hover:bg-royal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:cursor-not-allowed disabled:opacity-50";

function exportOrders(rows: SellerOrderRow[], filename: string): number {
  const header = ["Sipariş No", "Tarih", "Müşteri", "Şehir", "Ürünler", "Adet", "Tutar (TL)", "Ödeme", "Kargo Firması", "Takip No", "Durum", "Tahmini Kâr (TL)"];
  const body = rows.map((row) => [
    row.order.id,
    new Date(row.order.createdAt).toLocaleString("tr-TR"),
    row.customer.name,
    row.customer.city ?? "",
    row.items.map((item) => `${item.name} x${item.quantity}`).join(" | "),
    row.quantity,
    row.amount,
    row.paymentMethod,
    row.carrier,
    row.meta.tracking ?? "",
    orderUiLabels[row.ui],
    row.estimatedProfit === null || row.ui === "iptal" ? "" : Math.round(row.estimatedProfit * 100) / 100,
  ]);
  downloadTextFile(filename, toCsv([header, ...body]));
  return rows.length;
}

function OrdersView({ initial, initialOpenId }: { initial: OrderFilters; initialOpenId: string | null }) {
  const toast = useToast();
  const { rows, products, stockRows, now, shop, counts } = useSellerWorkspace();
  const actions = useOrderActions();
  const sample = useSampleData();

  const [filters, setFilters] = useState<OrderFilters>(initial);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [labelIds, setLabelIds] = useState<string[] | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SellerOrderRow | null>(null);

  const ctx = useMemo(() => ({ now, preparationDays: shop.shipping.preparationDays, stockRows }), [now, shop.shipping.preparationDays, stockRows]);
  const images = useMemo(() => new Map(products.map((product) => [`demo-${product.id}`, product.images?.[0]])), [products]);
  const alerts = useMemo(() => buildActionAlerts(rows, stockRows, now, shop.shipping.preparationDays), [rows, stockRows, now, shop.shipping.preparationDays]);
  const filtered = useMemo(() => filterOrders(rows, filters, ctx), [rows, filters, ctx]);
  const pageRows = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.order.id)), [rows, selected]);
  const openRow = useMemo(() => (openId ? rows.find((row) => row.order.id === openId) ?? null : null), [rows, openId]);
  const carriers = useMemo(() => uniqueSorted(rows.map((row) => row.carrier)), [rows]);
  const payments = useMemo(() => uniqueSorted(rows.map((row) => row.paymentMethod)), [rows]);
  const filterCount = activeFilterCount(filters);

  function change(patch: Partial<OrderFilters>) {
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(1);
    setSelected(new Set());
  }

  // Toplu akış: her adım yalnızca o adıma uygun seçili siparişleri sayar.
  const eligible = {
    prepare: selectedRows.filter((row) => row.manageable && row.ui === "yeni"),
    label: selectedRows.filter((row) => row.manageable && row.ui === "hazirlaniyor" && !row.meta.labelCreated),
    print: selectedRows.filter((row) => row.ui === "hazirlaniyor" && row.meta.labelCreated && !row.meta.labelPrinted),
    ship: selectedRows.filter((row) => row.manageable && row.ui === "kargoya-hazir"),
    deliver: selectedRows.filter((row) => row.manageable && row.ui === "kargoda"),
  };
  const ids = (list: SellerOrderRow[]) => list.map((row) => row.order.id);

  const bulkItems: MenuItem[] = [
    { key: "prepare", label: `Toplu Hazırla (${eligible.prepare.length})`, icon: PackageCheck, disabled: eligible.prepare.length === 0, onSelect: () => actions.prepare(ids(eligible.prepare)) },
    { key: "label", label: `Kargo Etiketi Oluştur (${eligible.label.length})`, icon: Tag, disabled: eligible.label.length === 0, onSelect: () => actions.createLabels(ids(eligible.label)) },
    { key: "print", label: `Etiketleri Yazdır (${eligible.print.length})`, icon: Printer, disabled: eligible.print.length === 0, onSelect: () => setLabelIds(ids(eligible.print)) },
    { key: "ship", label: `Kargoya Ver (${eligible.ship.length})`, icon: Truck, disabled: eligible.ship.length === 0, onSelect: () => actions.ship(ids(eligible.ship), { onlyReady: true }) },
    { key: "deliver", label: `Teslim Edildi İşaretle (${eligible.deliver.length})`, icon: CheckCircle2, disabled: eligible.deliver.length === 0, separatorBefore: true, onSelect: () => actions.deliver(ids(eligible.deliver)) },
  ];

  function menuFor(row: SellerOrderRow): MenuItem[] {
    const id = row.order.id;
    const items: MenuItem[] = [{ key: "open", label: "Detayları Gör", icon: Eye, onSelect: () => setOpenId(id) }];
    if (row.ui === "yeni") items.push({ key: "prepare", label: "Hazırla", icon: PackageCheck, disabled: !row.manageable, onSelect: () => actions.prepare([id]) });
    if (row.ui === "hazirlaniyor" && !row.meta.labelCreated) items.push({ key: "label", label: "Kargo Etiketi Oluştur", icon: Tag, disabled: !row.manageable, onSelect: () => actions.createLabels([id]) });
    if (row.ui === "hazirlaniyor" && row.meta.labelCreated && !row.meta.labelPrinted) items.push({ key: "print", label: "Etiketi Yazdır", icon: Printer, onSelect: () => setLabelIds([id]) });
    if (row.ui === "kargoya-hazir") items.push({ key: "ship", label: "Kargoya Ver", icon: Truck, disabled: !row.manageable, onSelect: () => actions.ship([id], { onlyReady: true }) });
    if (row.ui === "kargoda") items.push({ key: "deliver", label: "Teslim Edildi İşaretle", icon: CheckCircle2, disabled: !row.manageable, onSelect: () => actions.deliver([id]) });
    if (isWaiting(row)) items.push({ key: "cancel", label: "Siparişi İptal Et", icon: XCircle, danger: true, separatorBefore: true, disabled: !row.manageable, onSelect: () => setCancelTarget(row) });
    return items;
  }

  function runExport() {
    const source = selectedRows.length > 0 ? selectedRows : filtered;
    if (source.length === 0) {
      toast.info("Dışa aktarılacak sipariş yok.");
      return;
    }
    const count = exportOrders(source, selectedRows.length > 0 ? "vitrinplus-siparisler-secili.csv" : "vitrinplus-siparisler.csv");
    toast.success(`${count} sipariş dışa aktarıldı. Dosya Excel ile açılır (CSV).`);
  }

  const labelRows = labelIds ? rows.filter((row) => labelIds.includes(row.order.id)) : [];

  const emptyState =
    rows.length === 0 ? (
      <EmptyState
        icon={PackageSearch}
        title="Henüz siparişin yok"
        description="Müşteriler ürünlerini satın aldığında siparişler burada görünür. Paneli denemek için demo örnek veri yükleyebilirsin."
        action={
          <>
            <ActionButton variant="primary" onClick={sample.load}>
              Örnek Veri Yükle
            </ActionButton>
            <Link href={sellerHref.newProduct} className={linkButtonClass("secondary")}>
              Ürün Ekle
            </Link>
          </>
        }
      />
    ) : (
      <EmptyState
        icon={PackageSearch}
        title="Aramana uygun sipariş bulunamadı"
        description="Arama metnini ya da filtreleri değiştirmeyi dene."
        action={
          <ActionButton
            variant="secondary"
            onClick={() => {
              change(noOrderFilters);
            }}
          >
            Filtreleri Temizle
          </ActionButton>
        }
      />
    );

  return (
    <>
      <div className={drawerOffsetClass(openRow !== null)}>
        <PageHeader
          title="Siparişler"
          description="Siparişlerini yönet, kargola ve müşterilerini mutlu et."
          actions={
            <>
              <DropdownMenu label="Toplu işlemler" trigger={<>Toplu İşlemler{selectedRows.length > 0 ? ` (${selectedRows.length})` : ""} <ChevronDown size={14} aria-hidden /></>} triggerClassName={menuButton} items={bulkItems} />
              <ActionButton variant="primary" onClick={runExport}>
                <FileDown size={15} aria-hidden /> Excel&apos;e Aktar
              </ActionButton>
            </>
          }
        />

        <div className="flex flex-col gap-5">
          <OrderStatusCards rows={rows} counts={counts} active={filters.status} onSelect={(status) => change({ status })} />
          <ActionNeededPanel alerts={alerts} active={filters.alert} onSelect={(alert) => change({ alert })} />

          <Panel padded={false} aria-label="Sipariş listesi" className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3">
              <FilterBar>
                <SearchFilter value={filters.query} onChange={(query) => change({ query })} label="Sipariş no, müşteri veya ürün ara" placeholder="Sipariş no, müşteri veya ürün ara…" />
                <SelectFilter
                  label="Tarih aralığı"
                  value={filters.date}
                  onChange={(value) => change({ date: value as OrderFilters["date"] })}
                  options={[
                    { value: "", label: "Tarih Aralığı" },
                    { value: "bugun", label: "Bugün" },
                    { value: "7g", label: "Son 7 Gün" },
                    { value: "30g", label: "Son 30 Gün" },
                  ]}
                />
                <SelectFilter
                  label="Durum"
                  value={filters.status}
                  onChange={(value) => change({ status: value as OrderFilters["status"] })}
                  options={[
                    { value: "", label: "Tüm Durumlar" },
                    { value: "bekleyen", label: "Bekleyenler (işlem gerekli)" },
                    ...orderStatusFilters.map((status) => ({ value: status, label: orderUiLabels[status] })),
                  ]}
                />
                <SelectFilter label="Kargo firması" value={filters.carrier} onChange={(carrier) => change({ carrier })} options={[{ value: "", label: "Tüm Kargo Firmaları" }, ...carriers.map((name) => ({ value: name, label: name }))]} />
                <SelectFilter label="Ödeme yöntemi" value={filters.payment} onChange={(payment) => change({ payment })} options={[{ value: "", label: "Tüm Ödeme Yöntemleri" }, ...payments.map((name) => ({ value: name, label: name }))]} />
                <HeaderPopover
                  open={filterOpen}
                  onClose={() => setFilterOpen(false)}
                  align="right"
                  label="Ek filtreler"
                  className="w-[280px]"
                  trigger={
                    <button
                      type="button"
                      aria-expanded={filterOpen}
                      aria-haspopup="dialog"
                      onClick={() => setFilterOpen((open) => !open)}
                      className={cn(menuButton, "!text-royal-700", filterCount > 0 && "!border-royal-300 !bg-royal-50")}
                    >
                      <Filter size={14} aria-hidden /> Filtrele{filterCount > 0 ? ` (${filterCount})` : ""}
                    </button>
                  }
                >
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-[13px] font-bold text-navy-900">Aksiyon durumu</legend>
                    {alertOptions.map((option) => (
                      <label key={option.value || "all"} className="flex cursor-pointer items-center gap-2 text-[13px] text-navy-700">
                        <input type="radio" name="order-alert" checked={filters.alert === option.value} onChange={() => change({ alert: option.value })} className="h-4 w-4 accent-royal-600" />
                        {option.label}
                      </label>
                    ))}
                    <button type="button" onClick={() => change(noOrderFilters)} className="pt-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
                      Tüm filtreleri temizle
                    </button>
                  </fieldset>
                </HeaderPopover>
              </FilterBar>

              {selectedRows.length > 0 ? (
                <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-royal-50 px-3.5 py-2.5 text-[13px] text-royal-900">
                  <strong>{selectedRows.length} sipariş seçildi.</strong>
                  <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold underline hover:text-royal-950">
                    Seçimi temizle
                  </button>
                  <ol aria-label="Toplu kargo akışı" className="ml-auto flex flex-wrap items-center gap-1.5 text-xs">
                    <li>
                      <ActionButton size="sm" variant="secondary" disabled={eligible.prepare.length === 0} onClick={() => actions.prepare(ids(eligible.prepare))}>
                        1. Toplu Hazırla ({eligible.prepare.length})
                      </ActionButton>
                    </li>
                    <li aria-hidden>
                      <ArrowRight size={13} className="text-royal-400" />
                    </li>
                    <li>
                      <ActionButton size="sm" variant="secondary" disabled={eligible.label.length === 0} onClick={() => actions.createLabels(ids(eligible.label))}>
                        2. Kargo Etiketi Oluştur ({eligible.label.length})
                      </ActionButton>
                    </li>
                    <li aria-hidden>
                      <ArrowRight size={13} className="text-royal-400" />
                    </li>
                    <li>
                      <ActionButton size="sm" variant="secondary" disabled={eligible.print.length === 0} onClick={() => setLabelIds(ids(eligible.print))}>
                        3. Etiketleri Yazdır ({eligible.print.length})
                      </ActionButton>
                    </li>
                    <li aria-hidden>
                      <ArrowRight size={13} className="text-royal-400" />
                    </li>
                    <li>
                      <ActionButton size="sm" variant="primary" disabled={eligible.ship.length === 0} onClick={() => actions.ship(ids(eligible.ship), { onlyReady: true })}>
                        Kargoya Hazır → Kargoya Ver ({eligible.ship.length})
                      </ActionButton>
                    </li>
                  </ol>
                </div>
              ) : null}
            </div>

            <OrderTable
              rows={pageRows}
              images={images}
              selectedIds={selected}
              activeId={openId}
              onToggleRow={(id, checked) =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (checked) next.add(id);
                  else next.delete(id);
                  return next;
                })
              }
              onToggleAll={(checked) =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  for (const row of pageRows) {
                    if (checked) next.add(row.order.id);
                    else next.delete(row.order.id);
                  }
                  return next;
                })
              }
              onOpen={(row) => setOpenId(row.order.id)}
              menuFor={menuFor}
              empty={emptyState}
            />
            {filtered.length > 0 ? (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                itemLabel="sipariş"
              />
            ) : null}
          </Panel>

          {rows.length > 0 ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Boxes size={14} aria-hidden /> Sipariş iptal edildiğinde stok otomatik geri yüklenir; teslim edilen siparişler net hakedişe dönüşür.
            </p>
          ) : null}
        </div>
      </div>

      <OrderDrawer row={openRow} onClose={() => setOpenId(null)} actions={actions} images={images} onPrintLabels={setLabelIds} />

      <LabelModal
        open={labelIds !== null}
        rows={labelRows}
        onClose={() => setLabelIds(null)}
        onConfirm={() => {
          actions.markPrinted(labelRows.map((row) => row.order.id));
          setLabelIds(null);
        }}
      />
      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Sipariş iptal edilsin mi?"
        confirmLabel="Siparişi İptal Et"
        description={
          cancelTarget ? (
            <>
              <strong>#{cancelTarget.order.id}</strong> siparişi iptal edilir ve ürün stokları geri yüklenir. Bu işlem geri alınamaz.
            </>
          ) : null
        }
        onConfirm={() => {
          if (cancelTarget) actions.cancel([cancelTarget.order.id]);
          setCancelTarget(null);
        }}
      />
    </>
  );
}

/** Siparişler ekranı (referans 13). URL parametreleri: durum, uyari, q, siparis. */
export function OrdersPage() {
  const params = useSearchParams();
  const initial: OrderFilters = { ...noOrderFilters, status: parseStatusFilter(params.get("durum")), alert: parseAlertFilter(params.get("uyari")), query: params.get("q") ?? "" };
  return <OrdersView key={params.toString()} initial={initial} initialOpenId={params.get("siparis")} />;
}
