"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useDemo } from "@/components/demo/DemoProvider";
import { totals } from "@/lib/demo-marketplace";
import { formatPrice } from "@/lib/utils";
export function CheckoutPageClient() {
  const { lines, clear, coupon } = useCart();
  const demo = useDemo();
  const [express, setExpress] = useState(false);
  const [separateBilling, setSeparateBilling] = useState(false);
  const [decline, setDecline] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState("");
  const submitting = useRef(false);
  const resolved = lines.map(line => ({ line, product: demo.resolveProduct(line.slug) }));
  const pricing = totals(resolved.reduce((sum, { line, product }) => sum + (product?.price ?? 0) * line.quantity, 0), coupon, express);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (decline) { setError("Demo ödeme reddedildi. Sepetin ve stoklar korundu. Başarılı ödeme seçeneğiyle tekrar deneyebilirsin."); return; }
    const data = new FormData(event.currentTarget);
    const address = [data.get("name"), data.get("phone"), data.get("address"), data.get("district"), data.get("city")].map(value => String(value ?? "").trim());
    if (address.some(value => !value)) { setError("Teslimat alanlarını doldur."); return; }
    if (!/^\+?[\d\s()-]{10,18}$/.test(address[1])) { setError("Geçerli bir telefon numarası gir."); return; }
    submitting.current = true;
    try {
      const billing = separateBilling ? String(data.get("billing") ?? "").trim() : address.join(" · ");
      const id = demo.checkout(lines, { address: address.join(" · "), billingAddress: billing, coupon, express });
      setOrder(id);
      clear();
    } catch(e) { setError((e as Error).message); submitting.current = false; }
  }
  if (!demo.ready) return <p>Ödeme adımı yükleniyor…</p>;
  if (order) return <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-10 text-center"><h1 className="text-2xl font-extrabold">Demo siparişin kaydedildi</h1><p className="my-4 font-bold">{order}</p><p className="mb-6 text-sm">Gerçek ödeme alınmadı. Siparişini hesabından takip edebilirsin.</p><Link href="/siparislerim" className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white">Siparişlerime git</Link></section>;
  if (!lines.length) return <div className="rounded-2xl bg-white p-10 text-center"><h2 className="text-xl font-bold">Sepetin boş</h2><Link href="/demo" className="mt-4 inline-block text-brand-600">Ürünlere göz at</Link></div>;
  if (!demo.user) return <div className="rounded-2xl bg-white p-8"><h2 className="text-xl font-bold">Sipariş için demo hesabına giriş yap</h2><p className="my-4 text-sm">Sepetin korunur. Giriş yaptıktan sonra ödeme adımına dönebilirsin.</p><Link href="/giris" className="font-semibold text-brand-600">Giriş yap →</Link></div>;
  const field = "mt-1 block w-full rounded-xl border border-navy-200 bg-white p-3 text-sm";
  return <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-5"><section className="rounded-2xl border border-navy-100 bg-white p-6"><h2 className="mb-4 text-lg font-bold">Teslimat bilgileri</h2><p className="mb-4 text-xs text-navy-500">Demo için örnek bilgiler kullan.</p><div className="grid gap-4 sm:grid-cols-2">{[["name", "Ad Soyad"], ["phone", "Telefon"], ["city", "İl"], ["district", "İlçe"], ["address", "Açık Adres"]].map(([name, label]) => <label key={name} className="text-sm font-semibold">{label}<input name={name} required maxLength={200} type={name === "phone" ? "tel" : "text"} defaultValue={name === "name" ? demo.user!.name : undefined} className={field} /></label>)}</div><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={separateBilling} onChange={e => setSeparateBilling(e.target.checked)} />Fatura adresim farklı</label>{separateBilling && <label className="mt-3 block text-sm">Fatura adı ve açık adresi<textarea name="billing" required maxLength={500} className={field} /></label>}</section><section className="rounded-2xl border border-navy-100 bg-white p-6"><h2 className="mb-4 text-lg font-bold">Kargo</h2><label className="flex gap-2 text-sm"><input type="checkbox" checked={express} onChange={e => setExpress(e.target.checked)} />Hızlı kargo (+29,90 TL)</label><p className="mt-3 text-xs text-navy-500">İndirim sonrası 250 TL ve üzeri standart kargo ücretsiz; altında 49,90 TL. Demo genel kargo kuralı tüm mağazalara uygulanır.</p></section><section className="rounded-2xl border border-brand-100 bg-brand-50 p-6"><h2 className="text-lg font-bold">Ödeme simülasyonu</h2><p className="my-3 text-sm">Kart bilgisi gerekmez. Gerçek ödeme alınmaz.</p><label className="mr-5 inline-flex gap-2 text-sm"><input type="radio" name="payment" checked={!decline} onChange={() => setDecline(false)} />Başarılı ödeme</label><label className="inline-flex gap-2 text-sm"><input type="radio" name="payment" checked={decline} onChange={() => setDecline(true)} />Reddedilen ödeme</label></section></div><aside className="h-fit space-y-4 rounded-2xl border border-navy-100 bg-white p-6"><h2 className="text-lg font-bold">Sipariş özeti</h2>{resolved.map(({ line, product }) => <div key={line.lineId} className="flex justify-between gap-3 text-sm"><span>{product?.name ?? "Satıştan kaldırılan ürün"} × {line.quantity}</span><span>{formatPrice((product?.price ?? 0) * line.quantity)}</span></div>)}<div className="space-y-2 border-t border-navy-100 pt-4 text-sm">{[["Ürünler", pricing.subtotal], ["Kupon indirimi", -pricing.discount], ["Kargo", pricing.shipping], ["Genel toplam", pricing.total]].map(([label, value]) => <p key={String(label)} className="flex justify-between"><span>{label}</span><strong>{formatPrice(Number(value))}</strong></p>)}</div><label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" required className="mt-1" />Bunun bir demo siparişi olduğunu, gerçek ürün gönderilmeyeceğini anladım.</label>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<button className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white">Demo siparişi onayla</button><Link href="/sepet" className="block text-center text-sm text-brand-600">Sepete dön</Link></aside></form>;
}
