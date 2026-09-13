import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { mainCategories, extraCategories, categoryHref } from "@/data/categories";

export const metadata: Metadata = { title: "Tüm Kategoriler | PazarBuy" };

export default function KategorilerPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-7 py-6">
        <Breadcrumb items={[{ label: "Ana Sayfa", href: "/" }, { label: "Tüm Kategoriler" }]} />

        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Tüm Kategoriler</h1>
          <p className="mt-1.5 text-sm text-navy-400">
            PazarBuy&apos;daki binlerce satıcının ürünlerini kategoriye göre keşfet.
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy-400">Ana Kategoriler</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {mainCategories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(category.slug)}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-navy-100/80 bg-white p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
                  <category.icon size={20} />
                </span>
                <span className="text-sm font-semibold text-navy-800">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy-400">Diğer Kategoriler</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {extraCategories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(category.slug)}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-navy-100/80 bg-white p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
                  <category.icon size={20} />
                </span>
                <span className="text-sm font-semibold text-navy-800">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
