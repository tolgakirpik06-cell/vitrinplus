"use client";

import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useMarketplace } from "@/components/marketplace/context";
import { useEnsureProducts } from "@/components/marketplace/useEnsureProducts";
import { validateAddress } from "@/lib/domain/account";
import { lineStockProblem, quoteCart } from "@/lib/domain/cart-quote";
import { errorCode, friendlyError } from "@/lib/domain/errors";
import { EXPRESS_SHIPPING_FEE } from "@/lib/domain/order-engine";
import { useAsync } from "@/lib/use-async";
import { formatPrice } from "@/lib/utils";
import type { AddressView } from "@/lib/repositories/types";

const field = "mt-1 block w-full rounded-xl border border-navy-200 bg-white p-3 text-sm";
const NEW_ADDRESS = "new";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Gerçek (Supabase) mod ödeme adımı: sunucu fiyatı/stoğu doğrular, sipariş mağaza başına oluşur, ödeme alınmaz. */
export function LiveCheckout() {
  const { lines, clear, coupon } = useCart();
  const { ready, user, resolveProduct, services, placeOrder } = useMarketplace();
  const { loading: refreshing, error: refreshError, retry: retryRefresh } = useEnsureProducts(
    lines.map((line) => line.slug),
    { force: true },
  );
  const loadAddresses = useCallback(() => services.account.listAddresses(), [services]);
  const addresses = useAsync<AddressView[]>(user ? loadAddresses : null);

  const [express, setExpress] = useState(false);
  const [separateBilling, setSeparateBilling] = useState(false);
  const [selected, setSelected] = useState<string>(NEW_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderNos: string[]; total: number; duplicate: boolean } | null>(null);
  const submitting = useRef(false);
  // Aynı sipariş denemesi (ör. bağlantı koptu, yeniden dene) aynı anahtarı kullanır: çift sipariş oluşmaz.
  const keyRef = useRef<string | null>(null);

  const entries = useMemo(
    () => lines.flatMap((line) => {
      const product = resolveProduct(line.slug);
      return product ? [{ line, product }] : [];
    }),
    [lines, resolveProduct],
  );
  const missing = lines.length - entries.length;
  const quote = useMemo(() => quoteCart(entries, { coupon, express }), [entries, coupon, express]);
  const stockProblems = entries.filter(({ line, product }) => lineStockProblem(line, product) !== null);
  const saved = addresses.data ?? [];
  const usingSaved = selected !== NEW_ADDRESS && saved.some((item) => item.id === selected);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();

    let fields: { title: string; fullName: string; phone: string; city: string; district: string; addressLine: string; postalCode: string };
    const chosen = saved.find((item) => item.id === selected);
    if (usingSaved && chosen) {
      fields = { title: chosen.title, fullName: chosen.fullName, phone: chosen.phone, city: chosen.city, district: chosen.district, addressLine: chosen.addressLine, postalCode: chosen.postalCode };
    } else {
      fields = { title: text("title") || "Teslimat", fullName: text("name"), phone: text("phone"), city: text("city"), district: text("district"), addressLine: text("address"), postalCode: text("postalCode") };
    }
    const problems = validateAddress(fields);
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    const shipTo = { name: fields.fullName, phone: fields.phone, city: fields.city, district: fields.district, address: fields.addressLine };
    const billing = separateBilling ? text("billing") : [fields.fullName, fields.addressLine, fields.district, fields.city].join(" · ");
    if (separateBilling && billing.length < 5) {
      setError("Fatura adı ve adresini gir.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    keyRef.current ??= newKey();
    try {
      const result = await placeOrder({ lines, shipTo, billingAddress: billing, coupon, express, idempotencyKey: keyRef.current, note: text("note") || undefined });
      keyRef.current = null;
      clear();
      if (!usingSaved && saveAddress) {
        // Adres kaydı sipariş için gerekli değildir; başarısız olursa sipariş yine de geçerlidir.
        services.account.saveAddress(null, { ...fields, isDefault: saved.length === 0 }).catch(() => undefined);
      }
      setDone(result);
    } catch (caught) {
      // Sonucu bilinmeyen (ağ) hatalarında anahtar korunur → yeniden deneme çift sipariş üretmez. İş kuralı hatasında yeni deneme yeni anahtar alır.
      if (errorCode(caught) !== null) keyRef.current = null;
      setError(friendlyError(caught));
      submitting.current = false;
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p role="status">Ödeme adımı yükleniyor…</p>;

  if (done) {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-10 text-center">
        <h1 className="text-2xl font-extrabold">{done.duplicate ? "Bu sipariş zaten kaydedilmişti" : "Siparişin kaydedildi"}</h1>
        <p className="my-4 font-bold">{done.orderNos.join(" · ")}</p>
        <p className="mb-2 text-sm">Toplam: {formatPrice(done.total)}</p>
        <p className="mb-6 text-sm">Ödeme altyapısı henüz bağlı olmadığı için kartından tahsilat yapılmadı. Siparişin satıcıya iletildi; hesabından takip edebilirsin.</p>
        <Link href="/siparislerim" className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white">Siparişlerime git</Link>
      </section>
    );
  }
  if (!lines.length) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center">
        <h2 className="text-xl font-bold">Sepetin boş</h2>
        <Link href="/" className="mt-4 inline-block text-brand-600">Ürünlere göz at</Link>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="rounded-2xl bg-white p-8">
        <h2 className="text-xl font-bold">Sipariş vermek için giriş yapmalısın</h2>
        <p className="my-4 text-sm">Sepetin korunur. Giriş yaptıktan sonra ödeme adımına dönebilirsin.</p>
        <Link href="/giris?next=%2Fodeme" className="font-semibold text-brand-600">Giriş yap →</Link>
      </div>
    );
  }
  if (refreshing && entries.length === 0) return <p role="status">Güncel fiyat ve stok kontrol ediliyor…</p>;

  const blockedReason = refreshError
    ? "Güncel fiyat ve stok bilgisi alınamadı, bu yüzden sipariş verilemiyor."
    : quote.notOrderable.length > 0
      ? "Sepetinde örnek katalogdan gelen ürünler var. Bunlar gerçek modda sipariş edilemez; sepetten çıkar."
      : missing > 0
        ? "Sepetindeki bazı ürünler artık satışta değil. Sepete dönüp kaldır."
        : stockProblems.length > 0
          ? "Bazı ürünlerde stok yetersiz. Sepete dönüp adedi güncelle."
          : "";

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Teslimat bilgileri</h2>
          {addresses.error && (
            <p role="alert" className="mb-3 text-sm text-rose-600">
              Kayıtlı adresler yüklenemedi. {addresses.error}{" "}
              <button type="button" className="font-semibold underline" onClick={addresses.reload}>Tekrar dene</button>
            </p>
          )}
          {saved.length > 0 && (
            <div className="mb-4 space-y-2" role="radiogroup" aria-label="Kayıtlı adresler">
              {saved.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-navy-100 p-3 text-sm">
                  <input type="radio" name="address-choice" checked={selected === item.id} onChange={() => setSelected(item.id)} className="mt-1" />
                  <span>
                    <strong>{item.title}</strong>{item.isDefault ? " · varsayılan" : ""}
                    <br />
                    {item.fullName} · {item.phone}
                    <br />
                    {item.addressLine}, {item.district} / {item.city}
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-navy-100 p-3 text-sm">
                <input type="radio" name="address-choice" checked={!usingSaved} onChange={() => setSelected(NEW_ADDRESS)} />
                Yeni adres kullan
              </label>
            </div>
          )}
          {!usingSaved && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Ad Soyad<input name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={user.name} className={field} /></label>
                <label className="text-sm font-semibold">Telefon<input name="phone" required type="tel" autoComplete="tel" maxLength={18} className={field} /></label>
                <label className="text-sm font-semibold">İl<input name="city" required minLength={2} maxLength={60} autoComplete="address-level1" className={field} /></label>
                <label className="text-sm font-semibold">İlçe<input name="district" required minLength={2} maxLength={60} autoComplete="address-level2" className={field} /></label>
                <label className="text-sm font-semibold sm:col-span-2">Açık Adres<input name="address" required minLength={5} maxLength={300} autoComplete="street-address" className={field} /></label>
                <label className="text-sm font-semibold">Adres Başlığı<input name="title" maxLength={40} placeholder="Ev, İş…" className={field} /></label>
                <label className="text-sm font-semibold">Posta Kodu (isteğe bağlı)<input name="postalCode" maxLength={10} autoComplete="postal-code" className={field} /></label>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />Bu adresi hesabıma kaydet</label>
            </>
          )}
          <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={separateBilling} onChange={(event) => setSeparateBilling(event.target.checked)} />Fatura adresim farklı</label>
          {separateBilling && <label className="mt-3 block text-sm">Fatura adı ve açık adresi<textarea name="billing" required maxLength={500} className={field} /></label>}
          <label className="mt-4 block text-sm font-semibold">Satıcıya not (isteğe bağlı)<textarea name="note" maxLength={300} className={field} /></label>
        </section>

        <section className="rounded-2xl border border-navy-100 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Kargo</h2>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={express} onChange={(event) => setExpress(event.target.checked)} />Hızlı kargo (+{formatPrice(EXPRESS_SHIPPING_FEE)} / mağaza siparişi)</label>
          <p className="mt-3 text-xs text-navy-500">Kargo ücreti ve ücretsiz kargo eşiği her mağazanın kendi kuralına göre hesaplanır; sepetindeki her mağaza ayrı bir sipariş olur.</p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-bold">Ödeme</h2>
          <p className="mt-2 text-sm">Ödeme sağlayıcısı henüz bağlı değil. Siparişin kaydedilir ve satıcıya iletilir; bu aşamada kartından tahsilat yapılmaz.</p>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-navy-100 bg-white p-6">
        <h2 className="text-lg font-bold">Sipariş özeti</h2>
        {quote.groups.map((group) => (
          <div key={group.seller} className="space-y-2 rounded-xl bg-navy-50/50 p-3 text-sm">
            <p className="font-semibold">{group.seller}</p>
            {group.lines.map(({ line, product }) => (
              <div key={line.lineId} className="flex justify-between gap-3">
                <span>{product.name}{line.variantLabel ? ` (${line.variantLabel})` : ""} × {line.quantity}</span>
                <span>{formatPrice(product.price * line.quantity)}</span>
              </div>
            ))}
            <p className="flex justify-between text-xs text-navy-500"><span>Kargo</span><span>{group.quote.shipping === 0 ? "Ücretsiz" : formatPrice(group.quote.shipping)}</span></p>
          </div>
        ))}
        {quote.notOrderable.map(({ line, product }) => (
          <p key={line.lineId} className="text-sm text-amber-700">{product.name} — örnek katalog ürünü, sipariş edilemez.</p>
        ))}
        <div className="space-y-2 border-t border-navy-100 pt-4 text-sm">
          {(
            [
              ["Ürünler", quote.subtotal],
              ["Kupon indirimi", -quote.discount],
              ["Kargo", quote.shipping],
              ["Genel toplam", quote.total],
            ] as const
          ).map(([label, value]) => (
            <p key={label} className="flex justify-between"><span>{label}</span><strong>{formatPrice(value)}</strong></p>
          ))}
        </div>
        <p className="text-[11px] text-navy-400">Bu tutar önizlemedir. Kesin fiyat ve stok sipariş anında sunucuda doğrulanır.</p>
        <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" required className="mt-1" />Ödemenin bu aşamada alınmadığını, siparişimin ödeme alınmadan kaydedileceğini anladım.</label>
        {blockedReason && (
          <p role="alert" className="text-sm text-amber-700">
            {blockedReason}
            {refreshError ? (
              <>
                {" "}{refreshError}{" "}
                <button type="button" onClick={retryRefresh} className="font-semibold underline">Tekrar dene</button>
              </>
            ) : null}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button disabled={busy || refreshing || blockedReason !== ""} className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Sipariş kaydediliyor…" : "Siparişi onayla"}
        </button>
        <Link href="/sepet" className="block text-center text-sm text-brand-600">Sepete dön</Link>
      </aside>
    </form>
  );
}
