"use client";

import Link from "next/link";
import { useMarketplace } from "@/components/marketplace/context";
import { FOOTER_ACCOUNT_LINKS, footerLinkMode, resolveHeaderAccount } from "@/lib/header-account";

/**
 * Alt bilgideki "Hesabım" bağlantıları. "Giriş Yap" ve "Üye Ol" yalnızca girişsiz ziyaretçiye görünür;
 * oturum durumu belli olana kadar yerleri boş ayrılır, böylece hem yanlış bağlantı parlamaz hem sayfa kaymaz.
 */
export function FooterAccountLinks() {
  const { ready, signedIn, user } = useMarketplace();
  const account = resolveHeaderAccount({ ready, signedIn, user });
  return (
    <ul className="flex flex-col gap-2 text-sm text-navy-400">
      {FOOTER_ACCOUNT_LINKS.map((link) => {
        const mode = footerLinkMode(link, account);
        if (mode === "hidden") return null;
        if (mode === "placeholder") {
          // text-sm satır yüksekliği (1.25rem) kadar boş yer; içinde metin yok.
          return <li key={link.href} aria-hidden className="h-5" />;
        }
        return (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-brand-600">
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
