"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import type { SellerProduct, SellerCampaign, SellerSettings, SellerShipping } from "@/lib/demo-marketplace";
export type { SellerProduct, SellerCampaign, SellerSettings, SellerShipping } from "@/lib/demo-marketplace";
export function SellerDataProvider({ children }: { children: ReactNode }) {
  const { ready, shop } = useDemo();
  if (!ready) return <p>Mağaza yükleniyor…</p>;
  if (shop?.status !== "onaylandi") return <div className="rounded-2xl border border-navy-100 bg-white p-8"><h2 className="text-xl font-bold">Mağazanı açarak başla</h2><p className="my-4 text-sm text-navy-500">Satıcı panelini kullanmak için demo hesabınla başvur ve demo rehberinden mağazanı onayla.</p><Link href="/demo" className="font-semibold text-brand-600">Demo başvurusu ve onay →</Link></div>;
  return children;
}
export function useSellerData() {
  const { shop, updateShop } = useDemo();
  if (!shop) throw new Error("Mağaza gerekli");
  function valid(product: Omit<SellerProduct, "id">) {
    // Taslak ürünler yayına hazır olmak zorunda değil: yalnızca ad ve negatif olmayan sayılar aranır.
    const draft = product.status === "taslak";
    const priceOk = Number.isFinite(product.price) && (draft ? product.price >= 0 : product.price > 0);
    if (!product.name.trim() || (!draft && !product.sku.trim()) || !priceOk || !Number.isFinite(product.cost) || product.cost < 0 || !Number.isInteger(product.stock) || product.stock < 0) throw new Error("Ürün adı, SKU, fiyat ve stok bilgilerini kontrol et.");
  }
  function ensureUniqueSku(products: SellerProduct[], sku: string, exceptId?: string) {
    if (sku.trim() && products.some(p => p.sku === sku && p.id !== exceptId)) throw new Error("Bu SKU zaten kullanılıyor.");
  }
  return { ...shop,
    addProduct: (input: Omit<SellerProduct, "id">) => updateShop(s => { valid(input); ensureUniqueSku(s.products, input.sku); return { ...s, products: [{ ...input, id: crypto.randomUUID(), createdAt: input.createdAt ?? new Date().toISOString() }, ...s.products] }; }),
    /** Tek işlemde birden çok ürün ekler (CSV içe aktarma, kopyalama). Biri geçersizse hiçbiri eklenmez. */
    addProducts: (inputs: Omit<SellerProduct, "id">[]) => updateShop(s => {
      const created = inputs.map(input => ({ ...input, id: crypto.randomUUID(), createdAt: input.createdAt ?? new Date().toISOString() }));
      let known = s.products;
      for (const product of created) { valid(product); ensureUniqueSku(known, product.sku); known = [product, ...known]; }
      return { ...s, products: known };
    }),
    updateProduct: (id: string, patch: Partial<Omit<SellerProduct, "id">>) => updateShop(s => ({ ...s, products: s.products.map(p => { if (p.id !== id) return p; const next = { ...p, ...patch }; valid(next); if (patch.sku !== undefined) ensureUniqueSku(s.products, next.sku, id); return next; }) })),
    /** Seçili ürünlere aynı değişikliği tek işlemde uygular (toplu durum/stok güncelleme). */
    updateProducts: (ids: string[], patch: Partial<Omit<SellerProduct, "id" | "sku">>) => updateShop(s => ({ ...s, products: s.products.map(p => { if (!ids.includes(p.id)) return p; const next = { ...p, ...patch }; valid(next); return next; }) })),
    /** Her ürüne kendi stok/değer yamasını uygular (Stok Yönetimi'nde toplu kayıt). */
    patchProducts: (patches: Record<string, Partial<Omit<SellerProduct, "id" | "sku">>>) => updateShop(s => ({ ...s, products: s.products.map(p => { const patch = patches[p.id]; if (!patch) return p; const next = { ...p, ...patch }; valid(next); return next; }) })),
    deleteProduct: (id: string) => updateShop(s => ({ ...s, products: s.products.filter(p => p.id !== id) })),
    deleteProducts: (ids: string[]) => updateShop(s => ({ ...s, products: s.products.filter(p => !ids.includes(p.id)) })),
    addCampaign: (input: Omit<SellerCampaign, "id">) => updateShop(s => ({ ...s, campaigns: [{ ...input, id: crypto.randomUUID() }, ...s.campaigns] })),
    deleteCampaign: (id: string) => updateShop(s => ({ ...s, campaigns: s.campaigns.filter(c => c.id !== id) })),
    updateSettings: (patch: Partial<SellerSettings>) => updateShop(s => ({ ...s, settings: { ...s.settings, ...patch } })),
    updateShipping: (patch: Partial<SellerShipping>) => updateShop(s => ({ ...s, shipping: { ...s.shipping, ...patch } })),
  };
}
