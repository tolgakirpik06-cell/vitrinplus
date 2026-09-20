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
    if (!product.name.trim() || !product.sku.trim() || !Number.isFinite(product.price) || product.price <= 0 || !Number.isFinite(product.cost) || product.cost < 0 || !Number.isInteger(product.stock) || product.stock < 0) throw new Error("Ürün adı, SKU, fiyat ve stok bilgilerini kontrol et.");
  }
  return { ...shop,
    addProduct: (input: Omit<SellerProduct, "id">) => updateShop(s => { valid(input); if (s.products.some(p => p.sku === input.sku)) throw new Error("Bu SKU zaten kullanılıyor."); return { ...s, products: [{ ...input, id: crypto.randomUUID() }, ...s.products] }; }),
    updateProduct: (id: string, patch: Partial<Omit<SellerProduct, "id">>) => updateShop(s => ({ ...s, products: s.products.map(p => { if (p.id !== id) return p; const next = { ...p, ...patch }; valid(next); return next; }) })),
    deleteProduct: (id: string) => updateShop(s => ({ ...s, products: s.products.filter(p => p.id !== id) })),
    addCampaign: (input: Omit<SellerCampaign, "id">) => updateShop(s => ({ ...s, campaigns: [{ ...input, id: crypto.randomUUID() }, ...s.campaigns] })),
    deleteCampaign: (id: string) => updateShop(s => ({ ...s, campaigns: s.campaigns.filter(c => c.id !== id) })),
    updateSettings: (patch: Partial<SellerSettings>) => updateShop(s => ({ ...s, settings: { ...s.settings, ...patch } })),
    updateShipping: (patch: Partial<SellerShipping>) => updateShop(s => ({ ...s, shipping: { ...s.shipping, ...patch } })),
  };
}
