import Link from "next/link";
import { navCategories } from "@/data/categories";

const footerLinks = [
  { label: "Satıcı Ol", href: "/satici" },
  { label: "Satıcı Paneli", href: "/satici-panel" },
  { label: "Kampanyalar", href: "/kampanyalar" },
  { label: "Mağazalar", href: "/magazalar" },
  { label: "Tüm Kategoriler", href: "/kategoriler" },
];

export function Footer() {
  return (
    <footer className="mt-14 border-t border-navy-100 bg-white">
      <div className="section-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-xl font-extrabold text-navy-900">
            Pazar<span className="text-brand-500">Buy</span>
          </span>
          <p className="mt-3 max-w-xs text-sm text-navy-400">
            Ne istediğini söyle, ürün seni bulsun. Türkiye&apos;nin yeni nesil AI
            destekli pazaryeri.
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
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-navy-800">Satıcılar için</p>
          <p className="text-sm text-navy-400">
            %0 komisyon ile mağazanı bugün aç, sattıkça değil sadece aylık üyelik
            öde.
          </p>
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
          © {new Date().getFullYear()} PazarBuy. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
