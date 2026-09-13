"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Zap,
  CreditCard,
  ShieldCheck,
  MapPin,
  Receipt,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getProductBySlug } from "@/lib/mock-catalog";
import { cn, formatPrice } from "@/lib/utils";

type ShippingOption = "standart" | "hizli";

const SHIPPING_OPTIONS: { key: ShippingOption; label: string; detail: string; price: number }[] = [
  { key: "standart", label: "Standart Kargo", detail: "2-4 iş günü içinde teslim", price: 0 },
  { key: "hizli", label: "Hızlı Kargo", detail: "1 iş günü içinde teslim", price: 29.9 },
];

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  span = 1,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  span?: 1 | 2;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", span === 2 ? "sm:col-span-2" : "")}>
      <span className="text-xs font-semibold text-navy-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-navy-100 px-3.5 text-sm text-navy-800 outline-none transition-colors focus:border-brand-400"
      />
    </label>
  );
}

export function CheckoutPageClient() {
  const { lines, clear } = useCart();

  const resolvedLines = useMemo(
    () =>
      lines
        .map((line) => ({ line, product: getProductBySlug(line.slug) }))
        .filter((entry) => Boolean(entry.product)),
    [lines]
  );

  const subtotal = resolvedLines.reduce(
    (sum, { line, product }) => sum + (product ? product.price * line.quantity : 0),
    0
  );

  const [shippingOption, setShippingOption] = useState<ShippingOption>("standart");
  const shippingPrice = SHIPPING_OPTIONS.find((option) => option.key === shippingOption)?.price ?? 0;
  const total = subtotal + shippingPrice;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");

  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [agreementChecked, setAgreementChecked] = useState(false);
  const [preInfoChecked, setPreInfoChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const addressReady = fullName.trim() && phone.trim() && city.trim() && district.trim() && address.trim();
  const canSubmit =
    resolvedLines.length > 0 && Boolean(addressReady) && agreementChecked && preInfoChecked;

  function handleSubmit() {
    if (!canSubmit) return;
    const generatedOrderNumber = `PZB-${Date.now().toString().slice(-8)}`;
    setOrderNumber(generatedOrderNumber);
    setSubmitted(true);
    clear();
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={28} />
        </span>
        <div>
          <p className="text-lg font-extrabold text-navy-900">Siparişin Alındı!</p>
          <p className="mt-1.5 text-sm text-navy-500">
            Sipariş numaran: <span className="font-semibold text-navy-800">{orderNumber}</span>
          </p>
          <p className="mx-auto mt-3 max-w-sm text-xs text-navy-400">
            Bu demo bir sipariş akışıdır — gerçek bir ödeme alınmamıştır, kart bilgilerin kaydedilmemiştir.
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
        >
          Alışverişe Devam Et
        </Link>
      </div>
    );
  }

  if (resolvedLines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy-100 py-20 text-center">
        <p className="text-base font-bold text-navy-900">Sepetin boş</p>
        <p className="text-sm text-navy-400">Ödeme adımına geçebilmek için sepetinde ürün olmalı.</p>
        <Link
          href="/"
          className="mt-1 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
        >
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <MapPin size={16} className="text-brand-600" />
            Teslimat Adresi
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField label="Ad Soyad" value={fullName} onChange={setFullName} placeholder="Adınız Soyadınız" />
            <InputField label="Telefon" value={phone} onChange={setPhone} placeholder="05xx xxx xx xx" />
            <InputField label="İl" value={city} onChange={setCity} placeholder="İstanbul" />
            <InputField label="İlçe" value={district} onChange={setDistrict} placeholder="Kadıköy" />
            <InputField
              label="Açık Adres"
              value={address}
              onChange={setAddress}
              placeholder="Mahalle, cadde, sokak, kapı no"
              span={2}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
              <Receipt size={16} className="text-brand-600" />
              Fatura Adresi
            </h2>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-navy-500">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(event) => setSameAsShipping(event.target.checked)}
                className="h-4 w-4 rounded border-navy-200 text-brand-500 focus:ring-brand-300"
              />
              Teslimat adresiyle aynı
            </label>
          </div>

          {!sameAsShipping ? (
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <InputField label="Ad Soyad / Firma" value={billingName} onChange={setBillingName} />
              <InputField label="Açık Adres" value={billingAddress} onChange={setBillingAddress} span={2} />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold text-navy-900">Kargo Seçimi</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            {SHIPPING_OPTIONS.map((option) => (
              <label
                key={option.key}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                  shippingOption === option.key
                    ? "border-navy-900 bg-navy-50/60"
                    : "border-navy-100 hover:border-navy-300"
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="kargo"
                    checked={shippingOption === option.key}
                    onChange={() => setShippingOption(option.key)}
                    className="h-4 w-4 border-navy-200 text-brand-500 focus:ring-brand-300"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-800">
                      {option.key === "hizli" ? <Zap size={13} className="text-brand-600" /> : <Truck size={13} />}
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-navy-400">{option.detail}</span>
                  </span>
                </span>
                <span className="text-sm font-bold text-navy-900">
                  {option.price === 0 ? "Ücretsiz" : formatPrice(option.price)}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <CreditCard size={16} className="text-brand-600" />
            Kart Bilgileri
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-navy-400">
            <Lock size={11} />
            Bu demo sürümde gerçek ödeme alınmaz, kart bilgilerin hiçbir yere kaydedilmez.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InputField
              label="Kart Üzerindeki İsim"
              value={cardName}
              onChange={setCardName}
              placeholder="AD SOYAD"
              span={2}
            />
            <InputField
              label="Kart Numarası"
              value={cardNumber}
              onChange={setCardNumber}
              placeholder="0000 0000 0000 0000"
              span={2}
            />
            <InputField label="Son Kullanma Tarihi" value={cardExpiry} onChange={setCardExpiry} placeholder="AA/YY" />
            <InputField label="CVV" value={cardCvv} onChange={setCardCvv} placeholder="000" type="password" />
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-navy-100/80 bg-white p-5 lg:sticky lg:top-24">
        <p className="text-sm font-bold text-navy-900">Sipariş Özeti</p>

        <div className="flex flex-col gap-2 border-b border-navy-50 pb-4 text-xs text-navy-500">
          {resolvedLines.map(({ line, product }) =>
            product ? (
              <div key={line.lineId} className="flex items-center justify-between gap-2">
                <span className="line-clamp-1">
                  {product.name} <span className="text-navy-300">x{line.quantity}</span>
                </span>
                <span className="shrink-0 font-semibold text-navy-700">
                  {formatPrice(product.price * line.quantity)}
                </span>
              </div>
            ) : null
          )}
        </div>

        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between text-navy-500">
            <span>Ürün Toplamı</span>
            <span className="font-semibold text-navy-800">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-navy-500">
            <span>Kargo</span>
            <span className="font-semibold text-navy-800">
              {shippingPrice === 0 ? "Ücretsiz" : formatPrice(shippingPrice)}
            </span>
          </div>
          <div className="my-1 h-px bg-navy-50" />
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-navy-900">Genel Toplam</span>
            <span className="font-extrabold text-navy-900">{formatPrice(total)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-navy-50 pt-4 text-xs text-navy-500">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(event) => setAgreementChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-200 text-brand-500 focus:ring-brand-300"
            />
            <span>Mesafeli satış sözleşmesini okudum, kabul ediyorum.</span>
          </label>
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={preInfoChecked}
              onChange={(event) => setPreInfoChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-200 text-brand-500 focus:ring-brand-300"
            />
            <span>Ön bilgilendirme formunu okudum, onaylıyorum.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siparişi Onayla
        </button>

        <p className="flex items-center gap-1.5 text-[11px] text-navy-300">
          <ShieldCheck size={12} className="text-emerald-500" />
          256-bit SSL ile korunan güvenli bağlantı (demo)
        </p>
      </div>
    </div>
  );
}
