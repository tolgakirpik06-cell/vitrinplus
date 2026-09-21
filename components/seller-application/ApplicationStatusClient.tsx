"use client";
import Link from "next/link";
import { CheckCircle2, Clock, ShieldX } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";
import { getPlan } from "@/lib/plans";

const STATUS_COPY = {
  pending: { icon: Clock, title: "Başvurun inceleniyor", text: "Başvurun yönetici incelemesini bekliyor. Onaylanana kadar mağazan kapalıdır ve ürünlerin satışa çıkmaz.", tone: "bg-amber-50 text-amber-800" },
  approved: { icon: CheckCircle2, title: "Başvurun onaylandı", text: "Mağazan açıldı. Satıcı panelinden ürün ekleyip satışa başlayabilirsin.", tone: "bg-emerald-50 text-emerald-800" },
  rejected: { icon: ShieldX, title: "Başvurun reddedildi", text: "Bilgilerini güncelleyerek yeniden başvurabilirsin.", tone: "bg-rose-50 text-rose-800" },
  suspended: { icon: ShieldX, title: "Mağazan askıya alındı", text: "Mağazan şu an satış yapamıyor. Ayrıntı için destek ekibiyle iletişime geç.", tone: "bg-rose-50 text-rose-800" },
} as const;

function LiveStatus() {
  const { ready, user, sellerAccount } = useDemo();
  if (!ready) return <p>Başvurun yükleniyor…</p>;
  if (!user) {
    return (
      <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-navy-100 bg-white p-8">
        <h1 className="text-2xl font-bold">Başvuru durumu</h1>
        <p className="text-sm text-navy-500">Başvurunu görmek için giriş yapmalısın.</p>
        <Link href="/giris?next=%2Fsatici-basvuru%2Fdurum" className="block font-semibold text-brand-600">Giriş yap →</Link>
      </section>
    );
  }
  if (!sellerAccount) {
    return (
      <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-navy-100 bg-white p-8">
        <h1 className="text-2xl font-bold">Başvuru durumu</h1>
        <p className="text-sm text-navy-500">Bu hesaba ait bir mağaza başvurusu bulunamadı.</p>
        <Link href="/satici-basvuru" className="block font-semibold text-brand-600">Mağaza başvurusu yap →</Link>
      </section>
    );
  }
  const copy = STATUS_COPY[sellerAccount.status];
  const Icon = copy.icon;
  return (
    <section className="mx-auto max-w-lg space-y-5 rounded-2xl border border-navy-100 bg-white p-8">
      <h1 className="text-2xl font-bold">Başvuru durumu</h1>
      <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${copy.tone}`}>
        <Icon size={20} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">{copy.title}</p>
          <p className="mt-1">{copy.text}</p>
          {sellerAccount.rejectionReason && <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs">Gerekçe: {sellerAccount.rejectionReason}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-navy-400">Mağaza</dt><dd className="font-semibold">{sellerAccount.storeName}</dd>
        <dt className="text-navy-400">Başvuru no</dt><dd className="font-semibold">{sellerAccount.reference}</dd>
        <dt className="text-navy-400">Paket</dt><dd className="font-semibold">{getPlan(sellerAccount.plan).name}</dd>
      </dl>
      {sellerAccount.status === "approved" && <Link href="/satici-panel" className="block font-semibold text-brand-600">Satıcı paneline git →</Link>}
      {sellerAccount.status === "rejected" && <Link href="/satici-basvuru" className="block font-semibold text-brand-600">Yeniden başvur →</Link>}
    </section>
  );
}

export function ApplicationStatusClient() {
  const { shop, ready, mode } = useDemo();
  if (mode === "supabase") return <LiveStatus />;
  if (!ready) return <p>Başvurun yükleniyor…</p>;
  return <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-navy-100 bg-white p-8"><h1 className="text-2xl font-bold">Başvuru durumu</h1>{shop ? <><p className="font-semibold">{shop.settings.storeName}</p><p>{shop.reference}</p><p>{shop.status === "onaylandi" ? "Onaylandı" : shop.status === "reddedildi" ? "Reddedildi" : "Onay bekliyor"}</p></> : <p>Bu demo hesabına ait başvuru bulunamadı.</p>}<Link href={shop?.status === "onaylandi" ? "/satici-panel" : "/demo"} className="block font-semibold text-brand-600">{shop?.status === "onaylandi" ? "Satıcı paneline git" : "Demo başvuru ve onay ekranı"} →</Link></section>;
}
