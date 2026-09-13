import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, Mail, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "Giriş Yap | PazarBuy" };

export default function GirisPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-10 sm:py-14">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Giriş Yap" }]} />

        <div className="mx-auto w-full max-w-sm rounded-3xl border border-navy-100/80 bg-white p-6 shadow-card sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <LogIn size={22} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-navy-900 sm:text-2xl">Hesabına Giriş Yap</h1>
          <p className="mt-1.5 text-sm text-navy-400">Fırsatları kaçırma, siparişlerini takip et.</p>

          <div className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
              E-posta
              <span className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 focus-within:border-brand-300">
                <Mail size={16} className="shrink-0 text-navy-300" />
                <input
                  type="email"
                  placeholder="ornek@eposta.com"
                  className="w-full bg-transparent text-sm font-normal text-navy-800 placeholder:text-navy-300 focus:outline-none"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
              Şifre
              <span className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 focus-within:border-brand-300">
                <Lock size={16} className="shrink-0 text-navy-300" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm font-normal text-navy-800 placeholder:text-navy-300 focus:outline-none"
                />
              </span>
            </label>

            <button
              type="button"
              className="mt-1 flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
            >
              Giriş Yap
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-navy-400">
            Hesabın yok mu?{" "}
            <Link href="/kayit" className="font-semibold text-brand-600 hover:text-brand-700">
              Üye Ol
            </Link>
          </p>
          <p className="mt-3 text-center text-[11px] text-navy-300">
            Bu demo sürümde kimlik doğrulama devre dışıdır.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
