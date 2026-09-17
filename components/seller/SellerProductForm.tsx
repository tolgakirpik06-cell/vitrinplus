"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { SellerProduct } from "@/components/seller/SellerDataProvider";

type FormValues = {
  name: string;
  sku: string;
  category: string;
  price: string;
  cost: string;
  stock: string;
};

function toFormValues(product?: SellerProduct | null): FormValues {
  if (!product) return { name: "", sku: "", category: "", price: "", cost: "", stock: "" };
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: String(product.price),
    cost: String(product.cost),
    stock: String(product.stock),
  };
}

export function SellerProductForm({
  product,
  onCancel,
  onSubmit,
}: {
  product?: SellerProduct | null;
  onCancel: () => void;
  onSubmit: (values: Omit<SellerProduct, "id">) => void;
}) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(product));

  function handleChange<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(values.price);
    const cost = Number(values.cost);
    const stock = Number(values.stock);
    if (!values.name.trim() || Number.isNaN(price) || Number.isNaN(cost) || Number.isNaN(stock)) return;
    onSubmit({
      name: values.name.trim(),
      sku: values.sku.trim() || "SKU-YOK",
      category: values.category.trim() || "Genel",
      price: Math.max(0, price),
      cost: Math.max(0, cost),
      stock: Math.max(0, Math.round(stock)),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex flex-col gap-3.5 rounded-2xl border border-brand-100 bg-brand-50/30 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-navy-900">{product ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Kapat"
          className="flex h-7 w-7 items-center justify-center rounded-full text-navy-400 hover:bg-navy-100/60 hover:text-navy-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Ürün Adı
          <input
            required
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          SKU
          <input
            value={values.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            placeholder="ör. TKM-001"
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Kategori
          <input
            value={values.category}
            onChange={(e) => handleChange("category", e.target.value)}
            placeholder="ör. Elektronik"
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Stok Adedi
          <input
            required
            type="number"
            min={0}
            value={values.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Satış Fiyatı (TL)
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => handleChange("price", e.target.value)}
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-navy-600">
          Maliyet (TL)
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={values.cost}
            onChange={(e) => handleChange("cost", e.target.value)}
            className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm font-normal text-navy-800 focus:border-brand-300 focus:outline-none"
          />
        </label>
      </div>

      <p className="text-[11px] text-navy-400">
        Kâr marjı, girdiğin satış fiyatı ve maliyete göre Kâr Analizi sekmesinde otomatik hesaplanır.
      </p>

      <div className="flex items-center gap-2.5">
        <button
          type="submit"
          className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {product ? "Değişiklikleri Kaydet" : "Ürünü Ekle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-xs font-semibold text-navy-500 hover:bg-navy-100/60"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
