import type { Metadata } from "next";
import Link from "next/link";
import {
  Crown,
  Percent,
  Wand2,
  ClipboardList,
  BarChart3,
  Megaphone,
  ShieldCheck,
  Check,
  ArrowRight,
  Store,
  Rocket,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { PricingCard } from "@/components/home/PricingCard";
import { planList, COMMISSION_LABEL, UNLIMITED_ORDERS_LABEL } from "@/lib/plans";

export const metadata: Metadata = { title: "Satıcı Ol | VitrinPlus" };

const FOUNDER_TOTAL = 500;
const FOUNDER_TAKEN = 173;
const FOUNDER_LEFT = FOUNDER_TOTAL - FOUNDER_TAKEN;
const FOUNDER_PERCENT = Math.round((FOUNDER_TAKEN / FOUNDER_TOTAL) * 100);

const founderPerks = [
  "İlk 3 ay mağaza ücreti 0 TL",
  "%0 satış komisyonu",
  "Kurucu 500 rozeti",
  "Erken katılan mağazalara özel görünürlük avantajları",
];

const whyVitrinPlus = [
  { icon: Percent, title: "%0 Satış Komisyonu", description: "Sattığın her üründen değil, sadece aylık mağaza ücretinden kazanırız." },
  { icon: Wand2, title: "AI ile Ürün Ekleme", description: "Ürün fotoğrafını yükle; başlık, açıklama ve kategori AI tarafından oluşturulsun." },
  { icon: ClipboardList, title: "Sipariş Yönetimi", description: "Tüm siparişlerini tek panelden takip et, kargo süreçlerini yönet." },
  { icon: BarChart3, title: "Mağaza Analitiği", description: "Satış, görüntülenme ve dönüşüm verilerini gerçek zamanlı izle." },
  { icon: Megaphone, title: "Reklam & Kampanya Araçları", description: "Ürünlerini öne çıkar, kampanyalarla satışlarını artır." },
];

export default function SaticiPage() {
  return (
    <>
      <Header />

      <main className="flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 py-14 sm:py-20">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" aria-hidden />

          <div className="section-container relative flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-300 ring-1 ring-white/10">
              <Store size={14} />
              VitrinPlus Satıcı Programı
            </span>

            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
              <span className="text-brand-400">%0</span> Satış Komisyonu
            </h1>
            <p className="mt-4 max-w-xl text-balance text-base text-navy-200 sm:text-lg">
              Sattıkça kesinti yok. Sadece aylık mağaza ücretini öde.
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-300">
              Kazancından değil, mağazandan kazanırız.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/satici-basvuru"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_32px_-12px_rgba(124,58,237,0.6)] transition-colors hover:bg-brand-600"
              >
                Hemen Başvur
                <ArrowRight size={16} />
              </Link>
              <Button href="/satici-basvuru" variant="dark" size="lg">
                <Rocket size={16} />
                Mağaza Aç
              </Button>
            </div>
          </div>
        </section>

        {/* Kurucu 500 kampanyası */}
        <section className="section-container -mt-8 sm:-mt-10">
          <div className="relative overflow-hidden rounded-3xl border border-navy-800 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-6 shadow-2xl sm:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,#ffb066_1px,transparent_0)] [background-size:26px_26px]"
              aria-hidden
            />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-lg">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400/20 via-brand-400/20 to-amber-400/20 px-3.5 py-1.5 text-xs font-bold text-amber-300">
                  <Crown size={14} />
                  İlk 500 Kurucu Satıcı
                </span>

                <h2 className="mt-4 text-balance text-2xl font-extrabold leading-snug text-white sm:text-3xl">
                  Açılış Kampanyasına Katıl, Kurucu 500 Rozetini Kazan
                </h2>

                <ul className="mt-5 flex flex-col gap-2.5">
                  {founderPerks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-navy-200">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex w-full max-w-xs shrink-0 flex-col items-center gap-4 rounded-2xl border border-amber-400/20 bg-navy-950/60 p-6 text-center">
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-brand-400 to-amber-600 shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]">
                  <span className="absolute inset-[3px] rounded-full bg-navy-950" />
                  <Crown size={28} className="relative text-amber-300" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Kurucu 500 Rozeti</p>

                <div className="w-full">
                  <p className="text-sm font-semibold text-white">
                    500 Kurucu Mağazadan <span className="text-brand-400">{FOUNDER_LEFT}</span>&apos;i kaldı
                  </p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-navy-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500"
                      style={{ width: `${FOUNDER_PERCENT}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-navy-400">{FOUNDER_TAKEN} satıcı katıldı</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Neden VitrinPlus */}
        <section className="section-container py-14 sm:py-20">
          <div className="mb-9 text-center">
            <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Neden VitrinPlus?</h2>
            <p className="mx-auto mt-2.5 max-w-xl text-sm text-navy-400 sm:text-base">
              Satmaya odaklan, gerisini VitrinPlus&apos;ın AI destekli araçlarına bırak.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {whyVitrinPlus.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-navy-100/80 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon size={20} />
                </span>
                <p className="text-sm font-bold text-navy-900">{item.title}</p>
                <p className="text-xs leading-relaxed text-navy-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Paketler */}
        <section className="bg-white py-14 sm:py-20">
          <div className="section-container">
            <div className="mb-9 text-center">
              <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Mağaza Paketleri</h2>
              <p className="mx-auto mt-2.5 max-w-xl text-sm text-navy-400 sm:text-base">
                Her büyüklükte satıcı için sabit mağaza ücreti; tüm paketlerde {COMMISSION_LABEL.toLowerCase()} ve {UNLIMITED_ORDERS_LABEL.toLowerCase()}.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {planList.map((plan) => (
                <PricingCard key={plan.key} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* Başvuru */}
        <section id="basvuru" className="section-container py-14 sm:py-20">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-navy-100/80 bg-white p-7 text-center shadow-card sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <ShieldCheck size={22} />
            </span>
            <h2 className="text-xl font-extrabold text-navy-900 sm:text-2xl">Kurucu 500&apos;e Katılmaya Hazır mısın?</h2>
            <p className="text-sm text-navy-400">
              Mağazanı birkaç dakikada aç, ilk 3 ay ücretsiz mağaza avantajından yararlan.
            </p>

            <Button href="/satici-basvuru" variant="primary" size="lg" className="w-full sm:w-fit">
              Satıcı Başvurusuna Başla
              <ArrowRight size={16} />
            </Button>
            <p className="text-[11px] text-navy-300">
              Başvurunuz alındıktan sonra bilgileriniz doğrulanır ve mağazanız onaya açılır.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
