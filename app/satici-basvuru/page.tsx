import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SellerApplicationWizard } from "@/components/seller-application/SellerApplicationWizard";

export const metadata: Metadata = { title: "Satıcı Başvurusu | VitrinPlus" };

export default function SaticiBasvuruPage() {
  return (
    <>
      <Header />

      <main className="flex flex-col bg-navy-50/30">
        <section className="border-b border-navy-100/70 bg-white">
          <div className="section-container flex flex-col items-center py-10 text-center sm:py-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
              <ShieldCheck size={14} />
              Satıcı Başvurusu
            </span>
            <h1 className="mt-4 text-balance text-2xl font-extrabold text-navy-900 sm:text-4xl">
              VitrinPlus&apos;ta Satışa Başla
            </h1>
            <p className="mt-3 max-w-xl text-balance text-sm text-navy-500 sm:text-base">
              %0 pazaryeri komisyonu ile mağazanı aç.
            </p>
            <p className="mt-1.5 text-sm font-semibold text-brand-600">
              Kazancından değil, mağazandan kazanırız.
            </p>
          </div>
        </section>

        <section className="section-container py-8 sm:py-12">
          <SellerApplicationWizard />
        </section>
      </main>

      <Footer />
    </>
  );
}
