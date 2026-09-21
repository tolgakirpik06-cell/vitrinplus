import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { AuthFormCard } from "@/components/auth/AuthFormCard";

export const metadata: Metadata = { title: "Üye Ol | VitrinPlus" };

export default function KayitPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-10 sm:py-14">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Üye Ol" }]} />

        <Suspense fallback={<p className="text-center text-sm text-navy-400">Yükleniyor…</p>}>
          <AuthFormCard mode="kayit" />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
