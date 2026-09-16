import Link from "next/link";
import { Heart, ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import { navCategories } from "@/data/categories";

const corporateLinks = [
  { label: "Satıcı Ol", href: "/satici" },
  { label: "Satıcı Paneli", href: "/satici-panel" },
  { label: "Kampanyalar", href: "/kampanyalar" },
  { label: "Mağazalar", href: "/magazalar" },
  { label: "Tüm Kategoriler", href: "/kategoriler" },
];

const helpLinks = [
  { label: "Favorilerim", href: "/favoriler" },
  { label: "Sepetim", href: "/sepet" },
  { label: "Giriş Yap", href: "/giris" },
  { label: "Üye Ol", href: "/uye-ol" },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Güvenli Ödeme" },
  { icon: Truck, label: "Hızlı Teslimat" },
  { icon: Heart, label: "Kolay İade" },
  { icon: ShoppingBag, label: "Doğrulanmış Satıcılar" },
];

export function Footer() {
  return (
    <footer className="mt-14 border-t border-navy-100 bg-white">
      <div className="section-container grid grid-cols-2 gap-6 border-b border-navy-50 py-6 sm:grid-cols-4">
        {trustBadges.map((badge) => (
          <div key={badge.label} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <badge.icon size={17} />
            </span>
            <span className="text-xs font-semibold text-navy-700 sm:text-sm">{badge.label}</span>
          </div>
        ))}
      </div>

      <div className="section-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-extrabold text-white">
              VP<span className="text-lime-300">+</span>
            </span>
            <span className="text-xl font-extrabold text-navy-900">
              Vitrin<span className="text-brand-500">Plus</span>
            </span>
          </span>
          <p className="mt-3 max-w-xs text-sm text-navy-400">
            Vitrin senin, seçim senin. Moda, teknoloji ve güzellikte editoryal bir
            alışveriş deneyimi sunan yeni nesil pazaryeri.
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-800">Popüler Kategoriler</p>
          <ul className="flex flex-col gap-2 text-sm text-navy-400">
            {navCategories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={category.href} className="hover:text-brand-600">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-800">Kurumsal</p>
          <ul className="flex flex-col gap-2 text-sm text-navy-400">
            {corporateLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-800">Hesabım</p>
          <ul className="flex flex-col gap-2 text-sm text-navy-400">
            {helpLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm font-semibold text-navy-800">Satıcılar için</p>
          <p className="mt-1 text-sm text-navy-400">%0 komisyon, sadece aylık üyelik.</p>
          <Link
            href="/satici-basvuru"
            className="mt-3 inline-flex items-center rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Mağaza Aç
          </Link>
        </div>
      </div>

      <div className="border-t border-navy-100 py-4">
        <p className="section-container text-center text-xs text-navy-400">
          © {new Date().getFullYear()} VitrinPlus. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
