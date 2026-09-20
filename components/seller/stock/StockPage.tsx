"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bell, Boxes, ChevronDown, Filter, History, Lightbulb, Minus, PackageSearch, Plus, Power, PowerOff, Settings2, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { HeaderPopover } from "@/components/dashboard/DashboardHeader";
import { drawerOffsetClass } from "@/components/dashboard/DetailDrawer";
import type { MenuItem } from "@/components/dashboard/DropdownMenu";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FilterBar, SearchFilter, SelectFilter } from "@/components/dashboard/FilterBar";
import { ConfirmModal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Pagination, paginate } from "@/components/dashboard/Pagination";
import { Panel } from "@/components/dashboard/Panel";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, linkButtonClass } from "@/components/dashboard/form";
import { cn } from "@/lib/utils";
import { buildMovements, stockStatusLabels, summarizeStock, type StockRow, type StockStatus } from "@/lib/seller-analytics";
import { uniqueSorted } from "@/lib/seller-orders";
import {
  activeStockFilterCount,
  applyAdjust,
  filterStockRows,
  countStockTabs,
  noStockFilters,
  parseStockTab,
  resolveEdit,
  stockTabs,
  type AdjustMode,
  type StockChange,
  type StockDraft,
  type StockEdits,
  type StockFilters,
  type StockTab,
} from "@/lib/seller-stock";
import { useSampleData } from "@/components/seller/useSampleData";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { sellerHref } from "@/components/seller/seller-nav";
import { AdjustModal } from "@/components/seller/stock/AdjustModal";
import { StockDrawer } from "@/components/seller/stock/StockDrawer";
import { StockKpis } from "@/components/seller/stock/StockKpis";
import { StockAlertsModal, StockMovementsModal } from "@/components/seller/stock/StockModals";
import { StockTable } from "@/components/seller/stock/StockTable";
import { useStockActions } from "@/components/seller/stock/useStockActions";

const tabLabels: Record<StockTab, string> = { tumu: "Tümü", kritik: "Kritik Stok", stokyok: "Stokta Yok", "dusuk-devir": "Düşük Devir", hizli: "Hızlı Tükenen" };
const AI_STOCK_PROMPT = "7 gün içinde bitebilecek ürünleri göster";
const allModes: AdjustMode[] = ["add", "remove", "set", "threshold"];

const outlineButton =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-navy-700 hover:border-royal-200 hover:bg-royal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:cursor-not-allowed disabled:opacity-50";

type AdjustState = { rows: StockRow[]; mode: AdjustMode; modes: AdjustMode[]; immediate: boolean };

function StockView({ initialFilters, initialOpenId }: { initialFilters: StockFilters; initialOpenId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { stockRows, rows: orderRows, products, ops, now, ai } = useSellerWorkspace();
  const actions = useStockActions();
  const sample = useSampleData();

  const [filters, setFilters] = useState<StockFilters>(initialFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [edits, setEdits] = useState<StockEdits>({});
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<StockRow[] | null>(null);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const movements = useMemo(() => buildMovements(orderRows, ops.stockMovements, new Set(products.map((product) => product.id))), [orderRows, ops.stockMovements, products]);
  const summary = useMemo(() => summarizeStock(stockRows, movements, now), [stockRows, movements, now]);
  const tabCounts = useMemo(() => countStockTabs(stockRows), [stockRows]);
  const categories = useMemo(() => uniqueSorted(stockRows.map((row) => row.product.category)), [stockRows]);
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);

  const filtered = useMemo(() => {
    const list = filterStockRows(stockRows, filters, edits);
    if (filters.tab !== "kritik" && filters.tab !== "hizli") return list;
    // Acil olan üstte: tükenmeye en yakın ürün ilk sırada.
    return [...list].sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
  }, [stockRows, filters, edits]);
  const pageRows = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  const selectedRows = useMemo(() => stockRows.filter((row) => selected.has(row.product.id)), [stockRows, selected]);
  const openRow = useMemo(() => (openId ? stockRows.find((row) => row.product.id === openId) ?? null : null), [stockRows, openId]);
  const openMovements = useMemo(() => (openId ? movements.filter((movement) => movement.productId === openId) : []), [movements, openId]);

  const resolved = useMemo(() => stockRows.map((row) => ({ row, edit: resolveEdit(row, edits[row.product.id]) })), [stockRows, edits]);
  const changed = resolved.filter((item) => item.edit.changed);
  const invalidCount = changed.filter((item) => !item.edit.valid).length;
  const alertCount = stockRows.filter((row) => row.status === "out" || row.status === "critical" || row.fast).length;
  const filterCount = activeStockFilterCount({ ...filters, query: "", changedOnly: false });

  function change(patch: Partial<StockFilters>) {
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(1);
    setSelected(new Set());
  }

  function editRow(id: string, patch: StockDraft) {
    setEdits((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
  }

  function clearEdits(ids: string[]) {
    setEdits((previous) => {
      const next = { ...previous };
      for (const id of ids) delete next[id];
      return next;
    });
  }

  function saveAll() {
    if (invalidCount > 0) {
      toast.error("Geçersiz değerler var. Kırmızı işaretli alanları düzelt.");
      return;
    }
    const changes: StockChange[] = changed.map(({ row, edit }) => ({ product: row.product, stock: edit.stock, threshold: edit.threshold, previousStock: row.product.stock }));
    if (actions.save(changes)) clearEdits(changes.map((change) => change.product.id));
  }

  function applyAdjustment(state: AdjustState, mode: AdjustMode, value: number) {
    if (state.immediate) {
      const changes: StockChange[] = state.rows.map((row) => {
        const edit = resolveEdit(row, applyAdjust(row, undefined, mode, value));
        return { product: row.product, stock: edit.stock, threshold: edit.threshold, previousStock: row.product.stock };
      });
      if (actions.save(changes)) clearEdits(changes.map((change) => change.product.id));
    } else {
      setEdits((previous) => {
        const next = { ...previous };
        for (const row of state.rows) next[row.product.id] = applyAdjust(row, previous[row.product.id], mode, value);
        return next;
      });
      toast.success(`${state.rows.length} ürüne uygulandı. Kalıcı olması için “Değişiklikleri Kaydet”e bas.`);
    }
    setAdjust(null);
  }

  function openBulkAdjust(mode: AdjustMode, target: StockRow[] = selectedRows) {
    setAdjust({ rows: target, mode, modes: allModes, immediate: false });
  }

  function menuFor(row: StockRow): MenuItem[] {
    const passive = row.product.status === "pasif";
    return [
      { key: "detail", label: "Stok Detayı", icon: Boxes, onSelect: () => setOpenId(row.product.id) },
      { key: "add", label: "Stok Ekle (+)", icon: Plus, onSelect: () => setAdjust({ rows: [row], mode: "add", modes: ["add", "remove", "set"], immediate: true }) },
      { key: "remove", label: "Stok Düş (−)", icon: Minus, onSelect: () => setAdjust({ rows: [row], mode: "remove", modes: ["add", "remove", "set"], immediate: true }) },
      { key: "threshold", label: "Kritik Seviye Belirle", icon: Settings2, onSelect: () => setAdjust({ rows: [row], mode: "threshold", modes: ["threshold"], immediate: true }) },
      { key: "edit", label: "Ürünü Düzenle", icon: ArrowRight, separatorBefore: true, onSelect: () => router.push(`${sellerHref.products}/${encodeURIComponent(row.product.id)}`) },
      { key: "toggle", label: passive ? "Aktif Yap" : "Pasife Al", icon: passive ? Power : PowerOff, disabled: row.product.status === "taslak", onSelect: () => actions.setStatus([row.product.id], passive ? "aktif" : "pasif") },
    ];
  }

  const selectionIds = selectedRows.map((row) => row.product.id);
  const hasBar = selectedRows.length > 0 || changed.length > 0;

  const emptyState =
    stockRows.length === 0 ? (
      <EmptyState
        icon={PackageSearch}
        title="Stok takibi için önce ürün ekle"
        description="Ürünlerin burada stok, satış hızı ve tahmini tükenme günüyle listelenir. Hızlı denemek için demo örnek veri yükleyebilirsin."
        action={
          <>
            <Link href={sellerHref.newProduct} className={linkButtonClass("primary")}>
              <Plus size={14} aria-hidden /> Ürün Ekle
            </Link>
            <ActionButton variant="secondary" onClick={sample.load}>
              Örnek Veri Yükle
            </ActionButton>
          </>
        }
      />
    ) : (
      <EmptyState
        icon={PackageSearch}
        title="Aramana uygun ürün bulunamadı"
        description="Arama metnini ya da filtreleri değiştirmeyi dene."
        action={
          <ActionButton variant="secondary" onClick={() => change(noStockFilters)}>
            Filtreleri Temizle
          </ActionButton>
        }
      />
    );

  return (
    <>
      <div className={drawerOffsetClass(openRow !== null)}>
        <PageHeader
          title="Stok Yönetimi"
          description="Stoklarını kolayca yönet, kritik stokları takip et ve satış fırsatlarını kaçırma."
          actions={
            <>
              <button type="button" className={outlineButton} onClick={() => setMovementsOpen(true)}>
                <History size={15} aria-hidden /> Stok Hareketleri
              </button>
              <button type="button" className={outlineButton} onClick={() => setAlertsOpen(true)}>
                <Bell size={15} aria-hidden /> Stok Uyarıları{alertCount > 0 ? <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{alertCount}</span> : null}
              </button>
              <ActionButton variant="primary" disabled={stockRows.length === 0} onClick={() => openBulkAdjust("add", selectedRows.length > 0 ? selectedRows : filtered)}>
                <Plus size={15} aria-hidden /> Toplu Stok Güncelle
              </ActionButton>
            </>
          }
        />

        <div className="flex flex-col gap-5">
          <StockKpis summary={summary} rows={stockRows} />

          <Panel padded={false} aria-label="Stok listesi" className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Tabs
                  label="Stok durumu"
                  items={stockTabs.map((key) => ({ key, label: tabLabels[key], count: tabCounts[key] }))}
                  value={filters.tab}
                  onChange={(tab) => change({ tab })}
                />
              </div>
              <FilterBar>
                <SearchFilter value={filters.query} onChange={(query) => change({ query })} label="Ürün, SKU veya kategori ara" placeholder="Ürünlerde ara…" />
                <SelectFilter label="Kategori filtresi" value={filters.category} onChange={(category) => change({ category })} options={[{ value: "", label: "Tüm Kategoriler" }, ...categories.map((name) => ({ value: name, label: name }))]} />
                <HeaderPopover
                  open={filterOpen}
                  onClose={() => setFilterOpen(false)}
                  align="right"
                  label="Ek filtreler"
                  className="w-[260px]"
                  trigger={
                    <button
                      type="button"
                      aria-expanded={filterOpen}
                      aria-haspopup="dialog"
                      onClick={() => setFilterOpen((open) => !open)}
                      className={cn(outlineButton, "!text-royal-700", filterCount > 0 && "!border-royal-300 !bg-royal-50")}
                    >
                      <Filter size={14} aria-hidden /> Filtrele{filterCount > 0 ? ` (${filterCount})` : ""} <ChevronDown size={13} aria-hidden />
                    </button>
                  }
                >
                  <div className="space-y-4">
                    <fieldset className="space-y-2">
                      <legend className="mb-2 text-[13px] font-bold text-navy-900">Stok durumu</legend>
                      {([["", "Tümü"], ["normal", stockStatusLabels.normal], ["excess", stockStatusLabels.excess], ["critical", stockStatusLabels.critical], ["out", stockStatusLabels.out]] as [StockStatus | "", string][]).map(([value, label]) => (
                        <label key={value || "all"} className="flex cursor-pointer items-center gap-2 text-[13px] text-navy-700">
                          <input type="radio" name="stock-status" checked={filters.status === value} onChange={() => change({ status: value })} className="h-4 w-4 accent-royal-600" />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="mb-2 text-[13px] font-bold text-navy-900">Ürün durumu</legend>
                      {([["", "Tümü"], ["aktif", "Aktif"], ["pasif", "Pasif"], ["taslak", "Taslak"]] as [StockFilters["productState"], string][]).map(([value, label]) => (
                        <label key={value || "all"} className="flex cursor-pointer items-center gap-2 text-[13px] text-navy-700">
                          <input type="radio" name="stock-product-state" checked={filters.productState === value} onChange={() => change({ productState: value })} className="h-4 w-4 accent-royal-600" />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <button type="button" onClick={() => change(noStockFilters)} className="text-xs font-semibold text-royal-600 hover:text-royal-800">
                      Tüm filtreleri temizle
                    </button>
                  </div>
                </HeaderPopover>
              </FilterBar>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[12.5px] text-navy-700">
                <p className="flex min-w-[240px] flex-1 items-start gap-2">
                  <Lightbulb size={15} aria-hidden className="mt-0.5 shrink-0 text-amber-500" />
                  <span>
                    <strong className="text-amber-700">İpucu:</strong> Stokları toplu güncellemek için ürünlerin sağındaki kutulara yeni stok adetlerini yaz, ardından “Değişiklikleri Kaydet” butonuna tıkla. Excel gerekmez.
                  </span>
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                  <input type="checkbox" checked={filters.changedOnly} onChange={(event) => change({ changedOnly: event.target.checked })} className="h-4 w-4 rounded accent-royal-600" />
                  Sadece değiştirilenleri göster
                </label>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  disabled={changed.length === 0 && !filters.changedOnly}
                  onClick={() => {
                    setEdits({});
                    change({ changedOnly: false });
                  }}
                >
                  Sıfırla
                </ActionButton>
              </div>
            </div>

            <StockTable
              rows={pageRows}
              edits={edits}
              selectedIds={selected}
              activeId={openId}
              onEdit={editRow}
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
                    if (checked) next.add(row.product.id);
                    else next.delete(row.product.id);
                  }
                  return next;
                })
              }
              onOpen={(row) => setOpenId(row.product.id)}
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
                itemLabel="ürün"
              />
            ) : null}

            {hasBar ? (
              <div role="region" aria-label="Toplu işlem çubuğu" className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-royal-200 bg-white p-2.5 shadow-drawer">
                {selectedRows.length > 0 ? (
                  <>
                    <span className="px-1.5 text-xs font-bold text-navy-800">{selectedRows.length} ürün seçildi</span>
                    <ActionButton size="sm" variant="secondary" onClick={() => openBulkAdjust("threshold")}>
                      Kritik Seviye Belirle
                    </ActionButton>
                    <ActionButton size="sm" variant="secondary" className="!text-royal-700" onClick={() => openBulkAdjust("add")}>
                      <Plus size={13} aria-hidden /> Stok Ekle (+)
                    </ActionButton>
                    <ActionButton size="sm" variant="secondary" className="!text-royal-700" onClick={() => openBulkAdjust("remove")}>
                      <Minus size={13} aria-hidden /> Stok Düş (−)
                    </ActionButton>
                    <ActionButton size="sm" variant="secondary" onClick={() => actions.setStatus(selectionIds, "aktif")}>
                      <Power size={13} aria-hidden /> Aktif Yap
                    </ActionButton>
                    <ActionButton size="sm" variant="secondary" onClick={() => actions.setStatus(selectionIds, "pasif")}>
                      <PowerOff size={13} aria-hidden /> Pasif Yap
                    </ActionButton>
                    <ActionButton size="sm" variant="danger" onClick={() => setDeleteTargets(selectedRows)}>
                      <Trash2 size={13} aria-hidden /> Sil
                    </ActionButton>
                    <button type="button" onClick={() => setSelected(new Set())} className="px-1 text-xs font-semibold text-muted underline hover:text-navy-800">
                      Seçimi temizle
                    </button>
                  </>
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  {invalidCount > 0 ? (
                    <span role="alert" className="text-xs font-semibold text-rose-600">
                      {invalidCount} alan geçersiz
                    </span>
                  ) : null}
                  <ActionButton variant="primary" disabled={changed.length === 0 || invalidCount > 0} onClick={saveAll}>
                    Değişiklikleri Kaydet ({changed.length})
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel className="flex flex-wrap items-center gap-4">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <TrendingUp size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-extrabold text-navy-900">Vitrin AI ile Stok Analizi</h2>
              <p className="text-xs text-muted">Hangi ürünlerinin stokunu artırmalısın? Stoklarını analiz ederek sana özel öneriler sunalım.</p>
            </div>
            <ActionButton variant="secondary" className="!border-royal-300 !text-royal-700" onClick={() => ai.openAi(AI_STOCK_PROMPT)}>
              AI Analizi Başlat <ArrowRight size={14} aria-hidden />
            </ActionButton>
          </Panel>
        </div>
      </div>

      <StockDrawer
        row={openRow}
        movements={openMovements}
        onClose={() => setOpenId(null)}
        onSave={(changes) => {
          const ok = actions.save(changes);
          if (ok) clearEdits(changes.map((item) => item.product.id));
          return ok;
        }}
        onAdjust={(mode, row) => setAdjust({ rows: [row], mode, modes: mode === "threshold" ? ["threshold"] : ["add", "remove", "set"], immediate: true })}
        onOpenAi={ai.openAi}
      />

      {adjust ? (
        <AdjustModal
          key={`${adjust.mode}-${adjust.rows.length}-${adjust.immediate}`}
          initialMode={adjust.mode}
          modes={adjust.modes}
          immediate={adjust.immediate}
          targetLabel={adjust.rows.length === 1 ? adjust.rows[0].product.name : `${adjust.rows.length} ürün`}
          onClose={() => setAdjust(null)}
          onApply={(mode, value) => applyAdjustment(adjust, mode, value)}
        />
      ) : null}
      <StockMovementsModal open={movementsOpen} onClose={() => setMovementsOpen(false)} movements={movements} productNames={productNames} />
      <StockAlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} rows={stockRows} onOpenProduct={setOpenId} />
      <ConfirmModal
        open={deleteTargets !== null}
        onClose={() => setDeleteTargets(null)}
        title={deleteTargets && deleteTargets.length > 1 ? `${deleteTargets.length} ürün silinsin mi?` : "Ürün silinsin mi?"}
        confirmLabel="Sil"
        description="Seçili ürünler kalıcı olarak silinir ve vitrinden kalkar. Bu işlem geri alınamaz. Geçmiş siparişler etkilenmez."
        onConfirm={() => {
          if (deleteTargets) {
            const ids = deleteTargets.map((row) => row.product.id);
            if (actions.remove(ids)) {
              clearEdits(ids);
              setSelected((previous) => new Set([...previous].filter((id) => !ids.includes(id))));
              if (openId && ids.includes(openId)) setOpenId(null);
            }
          }
          setDeleteTargets(null);
        }}
      />
    </>
  );
}

/** Stok Yönetimi ekranı (referans 24). URL parametreleri: filtre (kritik, stok-yok, hizli, dusuk-devir), q, urun. */
export function StockPage() {
  const params = useSearchParams();
  const initialFilters: StockFilters = { ...noStockFilters, tab: parseStockTab(params.get("filtre")), query: params.get("q") ?? "" };
  return <StockView key={params.toString()} initialFilters={initialFilters} initialOpenId={params.get("urun")} />;
}
