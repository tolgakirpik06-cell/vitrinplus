"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Download, FileUp, Filter, LineChart, Lock, PackageSearch, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DropdownMenu, type MenuItem } from "@/components/dashboard/DropdownMenu";
import { HeaderPopover } from "@/components/dashboard/DashboardHeader";
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
import { downloadTextFile, toCsv } from "@/lib/csv";
import { hasFeature } from "@/lib/plans";
import {
  buildProductRows,
  countTabs,
  displayState,
  filterProducts,
  noExtraFilters,
  productCategories,
  productTabs,
  sortProducts,
  type ProductExtraFilters,
  type ProductRow,
  type ProductSort,
  type ProductTab,
} from "@/lib/seller-products";
import { useSellerData } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { useSampleData } from "@/components/seller/useSampleData";
import { sellerHref } from "@/components/seller/seller-nav";
import { BulkUploadModal } from "@/components/seller/products/BulkUploadModal";
import { ProductKpis } from "@/components/seller/products/ProductKpis";
import { AiPromoBanner, BulkUploadCard, PlanFeaturesCard } from "@/components/seller/products/ProductRail";
import { ProductTable } from "@/components/seller/products/ProductTable";

const tabLabels: Record<ProductTab, string> = { tumu: "Tümü", aktif: "Aktif", pasif: "Pasif", taslak: "Taslak", kritik: "Kritik Stok", stokyok: "Stokta Yok" };
const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "yeni", label: "En Yeniler" },
  { value: "cok-satan", label: "En Çok Satanlar" },
  { value: "ad", label: "Ada Göre (A-Z)" },
  { value: "fiyat-artan", label: "Fiyat (Artan)" },
  { value: "fiyat-azalan", label: "Fiyat (Azalan)" },
  { value: "stok-az", label: "Stok (Az → Çok)" },
];

function parseTab(value: string | null): ProductTab {
  if (value === "stok-yok") return "stokyok";
  return productTabs.find((tab) => tab === value) ?? "tumu";
}

const stateText = { aktif: "Aktif", pasif: "Pasif", taslak: "Taslak", stokyok: "Stokta Yok" } as const;

function exportRows(rows: ProductRow[], filename: string): number {
  const header = ["Ürün Adı", "SKU", "Kategori", "Marka", "Model", "Satış Fiyatı", "Birim Maliyet", "Stok", "Durum"];
  const body = rows.map((row) => [row.product.name, row.product.sku, row.product.category, row.product.brand ?? "", row.product.model ?? "", row.product.price, row.unitCost || "", row.stock.sellable, stateText[displayState(row)]]);
  downloadTextFile(filename, toCsv([header, ...body]));
  return rows.length;
}

function ProductsView({ initialTab, initialQuery, initialBulk }: { initialTab: ProductTab; initialQuery: string; initialBulk: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { stockRows, now, planKey } = useSellerWorkspace();
  const { addProduct, updateProduct, updateProducts, deleteProduct, deleteProducts } = useSellerData();
  const sample = useSampleData();

  const [tab, setTab] = useState<ProductTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<ProductSort>("yeni");
  const [extra, setExtra] = useState<ProductExtraFilters>(noExtraFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(initialBulk);
  const [deleteTargets, setDeleteTargets] = useState<ProductRow[] | null>(null);

  const allRows = useMemo(() => buildProductRows(stockRows), [stockRows]);
  const counts = useMemo(() => countTabs(allRows), [allRows]);
  const categories = useMemo(() => productCategories(allRows), [allRows]);
  const filtered = useMemo(() => sortProducts(filterProducts(allRows, { tab, query, category, extra, now }), sort), [allRows, tab, query, category, extra, now, sort]);
  const pageRows = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  const selectedRows = useMemo(() => allRows.filter((row) => selected.has(row.product.id)), [allRows, selected]);
  const bulkLocked = !hasFeature(planKey, "csvImport");
  const extraCount = Object.values(extra).filter(Boolean).length;

  // Filtre değişince ilk sayfaya dön ve seçimi temizle (görünmeyen ürünler üzerinde toplu işlem yapılmasın).
  function resetView() {
    setPage(1);
    setSelected(new Set());
  }

  function attempt(action: () => void, success: string) {
    try {
      action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    }
  }

  function uniqueSku(base: string): string {
    const taken = new Set(allRows.map((row) => row.product.sku));
    let candidate = `${base || "KOPYA"}-K`;
    for (let index = 2; taken.has(candidate); index += 1) candidate = `${base || "KOPYA"}-K${index}`;
    return candidate;
  }

  function duplicate(row: ProductRow) {
    const { id, ...rest } = row.product;
    void id;
    attempt(() => addProduct({ ...rest, name: `${rest.name} (Kopya)`, sku: uniqueSku(rest.sku), status: "taslak", sample: undefined, createdAt: undefined }), "Ürün taslak olarak kopyalandı.");
  }

  function toggle(row: ProductRow) {
    const publish = row.product.status === "taslak" || row.product.status === "pasif";
    attempt(() => updateProduct(row.product.id, { status: publish ? "aktif" : "pasif" }), publish ? "Ürün satışa alındı." : "Ürün pasife alındı.");
  }

  function confirmDelete() {
    if (!deleteTargets) return;
    const ids = deleteTargets.map((row) => row.product.id);
    attempt(() => (ids.length === 1 ? deleteProduct(ids[0]) : deleteProducts(ids)), `${ids.length} ürün silindi.`);
    setSelected((previous) => new Set([...previous].filter((id) => !ids.includes(id))));
    setDeleteTargets(null);
  }

  const exportItems: MenuItem[] = [
    { key: "all", label: "Tüm ürünler (CSV)", icon: Download, disabled: allRows.length === 0, onSelect: () => toast.success(`${exportRows(allRows, "vitrinplus-urunler.csv")} ürün CSV olarak indirildi.`) },
    { key: "filtered", label: "Filtrelenenler (CSV)", icon: Filter, disabled: filtered.length === 0, onSelect: () => toast.success(`${exportRows(filtered, "vitrinplus-urunler-filtreli.csv")} ürün CSV olarak indirildi.`) },
    { key: "selected", label: "Seçilenler (CSV)", icon: Download, disabled: selectedRows.length === 0, onSelect: () => toast.success(`${exportRows(selectedRows, "vitrinplus-urunler-secili.csv")} ürün CSV olarak indirildi.`) },
  ];

  const ids = selectedRows.map((row) => row.product.id);
  const bulkItems: MenuItem[] = [
    { key: "activate", label: "Seçilenleri Aktifleştir", icon: Power, disabled: ids.length === 0, onSelect: () => attempt(() => updateProducts(ids, { status: "aktif" }), `${ids.length} ürün satışa alındı.`) },
    { key: "deactivate", label: "Seçilenleri Pasife Al", icon: PowerOff, disabled: ids.length === 0, onSelect: () => attempt(() => updateProducts(ids, { status: "pasif" }), `${ids.length} ürün pasife alındı.`) },
    { key: "delete", label: "Seçilenleri Sil", icon: Trash2, danger: true, separatorBefore: true, disabled: ids.length === 0, onSelect: () => setDeleteTargets(selectedRows) },
  ];

  const rowActions = {
    onEdit: (row: ProductRow) => router.push(`${sellerHref.products}/${encodeURIComponent(row.product.id)}`),
    onStock: (row: ProductRow) => router.push(`${sellerHref.stock}?urun=${encodeURIComponent(row.product.id)}`),
    onDuplicate: duplicate,
    onToggle: toggle,
    onDelete: (row: ProductRow) => setDeleteTargets([row]),
  };

  const menuButton = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-navy-700 hover:border-royal-200 hover:bg-royal-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:cursor-not-allowed disabled:opacity-50";

  const emptyState =
    allRows.length === 0 ? (
      <EmptyState
        icon={PackageSearch}
        title="Henüz ürünün yok"
        description="İlk ürününü ekleyerek satışa başla. Hızlı denemek için demo örnek veri de yükleyebilirsin."
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
        description="Arama veya filtreleri değiştirmeyi dene."
        action={
          <ActionButton
            variant="secondary"
            onClick={() => {
              setQuery("");
              setCategory("");
              setExtra(noExtraFilters);
              setTab("tumu");
              resetView();
            }}
          >
            Filtreleri Temizle
          </ActionButton>
        }
      />
    );

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="Ürünlerini yönet, stoklarını kontrol et ve satış performansını takip et."
        actions={
          <>
            <DropdownMenu label="Dışa aktar" trigger={<>Dışa Aktar <ChevronDown size={14} aria-hidden /></>} triggerClassName={menuButton} items={exportItems} />
            <DropdownMenu label="Toplu işlemler" trigger={<>Toplu İşlemler {selectedRows.length > 0 ? `(${selectedRows.length})` : ""} <ChevronDown size={14} aria-hidden /></>} triggerClassName={menuButton} items={bulkItems} />
            <ActionButton variant="secondary" onClick={() => setBulkOpen(true)} className="!border-royal-300 !text-royal-700">
              {bulkLocked ? <Lock size={14} aria-hidden /> : <FileUp size={14} aria-hidden />} Toplu Ürün Yükle
            </ActionButton>
            <Link href={sellerHref.newProduct} className={linkButtonClass("primary")}>
              <Plus size={15} aria-hidden /> Ürün Ekle
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ProductKpis counts={counts} />

          <Panel padded={false} aria-label="Ürün listesi" className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3">
              <Tabs
                label="Ürün durumu"
                items={productTabs.map((key) => ({ key, label: tabLabels[key], count: counts[key] }))}
                value={tab}
                onChange={(value) => {
                  setTab(value);
                  resetView();
                }}
              />
              <FilterBar>
                <SearchFilter
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    resetView();
                  }}
                  label="Ürün, SKU veya kategori ara"
                  placeholder="Ürünlerde ara…"
                />
                <SelectFilter
                  label="Kategori filtresi"
                  value={category}
                  onChange={(value) => {
                    setCategory(value);
                    resetView();
                  }}
                  options={[{ value: "", label: "Tüm Kategoriler" }, ...categories.map((name) => ({ value: name, label: name }))]}
                />
                <HeaderPopover
                  open={filterOpen}
                  onClose={() => setFilterOpen(false)}
                  align="left"
                  label="Ek filtreler"
                  className="w-[260px]"
                  trigger={
                    <button
                      type="button"
                      aria-expanded={filterOpen}
                      aria-haspopup="dialog"
                      onClick={() => setFilterOpen((open) => !open)}
                      className={cn(menuButton, "h-10 !px-3 !text-royal-700", extraCount > 0 && "!border-royal-300 !bg-royal-50")}
                    >
                      <Filter size={14} aria-hidden /> Filtrele{extraCount > 0 ? ` (${extraCount})` : ""}
                    </button>
                  }
                >
                  <fieldset className="space-y-2.5">
                    <legend className="mb-2 text-[13px] font-bold text-navy-900">Ek filtreler</legend>
                    {(
                      [
                        ["missingCost", "Maliyeti girilmemiş ürünler"],
                        ["onSale", "İndirimi aktif ürünler"],
                        ["lowMargin", "Kâr marjı %10'un altında"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 text-[13px] text-navy-700">
                        <input
                          type="checkbox"
                          checked={extra[key]}
                          onChange={(event) => {
                            setExtra((previous) => ({ ...previous, [key]: event.target.checked }));
                            resetView();
                          }}
                          className="h-4 w-4 rounded border-navy-200 accent-royal-600"
                        />
                        {label}
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setExtra(noExtraFilters);
                        resetView();
                      }}
                      className="text-xs font-semibold text-royal-600 hover:text-royal-800"
                    >
                      Filtreleri sıfırla
                    </button>
                  </fieldset>
                </HeaderPopover>
                <SelectFilter
                  label="Sıralama"
                  value={sort}
                  onChange={(value) => {
                    setSort(value as ProductSort);
                    setPage(1);
                  }}
                  options={sortOptions}
                />
              </FilterBar>
              {selectedRows.length > 0 ? (
                <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-royal-50 px-3.5 py-2 text-[13px] text-royal-800">
                  <strong>{selectedRows.length} ürün seçildi.</strong>
                  <button type="button" onClick={() => setSelected(new Set())} className="font-semibold underline hover:text-royal-950">
                    Seçimi temizle
                  </button>
                  <span className="text-xs text-royal-700">İşlemler için “Toplu İşlemler” menüsünü kullan.</span>
                </div>
              ) : null}
            </div>

            <ProductTable
              rows={pageRows}
              selectedIds={selected}
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
              actions={rowActions}
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
          </Panel>

          <Panel className="flex flex-wrap items-center gap-4">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <LineChart size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-extrabold text-navy-900">Ürün Performansı</h2>
              <p className="text-xs text-muted">En çok satan, en çok görüntülenen ve en yüksek kâr getiren ürünlerini analiz et.</p>
            </div>
            <Link href={sellerHref.analytics} className={linkButtonClass("secondary")}>
              Detaylı Analiz Görüntüle <ArrowRight size={14} aria-hidden />
            </Link>
          </Panel>
        </div>

        <aside aria-label="Ürün yardımcıları" className="grid min-w-0 gap-5 md:grid-cols-3 2xl:grid-cols-1">
          <BulkUploadCard onOpen={() => setBulkOpen(true)} />
          <PlanFeaturesCard />
          <AiPromoBanner />
        </aside>
      </div>

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <ConfirmModal
        open={deleteTargets !== null}
        onClose={() => setDeleteTargets(null)}
        onConfirm={confirmDelete}
        title={deleteTargets && deleteTargets.length > 1 ? `${deleteTargets.length} ürün silinsin mi?` : "Ürün silinsin mi?"}
        confirmLabel="Sil"
        description={
          deleteTargets && deleteTargets.length === 1 ? (
            <>
              <strong>{deleteTargets[0].product.name}</strong> kalıcı olarak silinir ve vitrinden kalkar. Bu işlem geri alınamaz. Geçmiş siparişler etkilenmez.
            </>
          ) : (
            "Seçili ürünler kalıcı olarak silinir ve vitrinden kalkar. Bu işlem geri alınamaz. Geçmiş siparişler etkilenmez."
          )
        }
      />
    </>
  );
}

/** Ürünler ekranı (referans 19). URL parametreleri: durum, q, toplu. */
export function ProductsPage() {
  const params = useSearchParams();
  return <ProductsView key={params.toString()} initialTab={parseTab(params.get("durum"))} initialQuery={params.get("q") ?? ""} initialBulk={params.get("toplu") === "1"} />;
}
