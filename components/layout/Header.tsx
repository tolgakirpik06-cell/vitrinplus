import Link from "next/link";
import { Heart, ShoppingCart, LogIn, Store } from "lucide-react";
import { Logo } from "./Logo";
import { AiSearchBar } from "./AiSearchBar";
import { MobileNav } from "./MobileNav";
import { CategoryNav } from "./CategoryNav";
import { Button } from "@/components/ui/Button";
import { CartBadge } from "@/components/cart/CartBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/70 bg-white/90 backdrop-blur">
      <div className="section-container flex items-center gap-4 py-3 lg:py-4">
        <Logo />

        <div className="hidden flex-1 md:block">
          <AiSearchBar />
        </div>

        <div className="ml-auto hidden items-center gap-1.5 lg:flex">
          <Link
            href="/favoriler"
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-navy-600 transition-colors hover:bg-navy-50 hover:text-brand-600"
          >
            <Heart size={20} />
            <span className="text-[11px] font-medium">Favoriler</span>
          </Link>
          <Link
            href="/sepet"
            className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-navy-600 transition-colors hover:bg-navy-50 hover:text-brand-600"
          >
            <span className="relative">
              <ShoppingCart size={20} />
              <CartBadge className="-right-2 -top-2" />
            </span>
            <span className="text-[11px] font-medium">Sepet</span>
          </Link>

          <span className="mx-2.5 h-7 w-px bg-navy-100" aria-hidden />

          <Link
            href="/satici-basvuru"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-navy-600 transition-colors hover:text-brand-600"
          >
            <Store size={16} />
            Satıcı Ol
          </Link>
          <Button href="/giris" variant="outline" size="sm" className="whitespace-nowrap">
            <LogIn size={15} />
            Giriş Yap
          </Button>
          <Button href="/kayit" variant="primary" size="sm" className="whitespace-nowrap">
            Üye Ol
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Link
            href="/sepet"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-navy-100 text-navy-700"
            aria-label="Sepet"
          >
            <ShoppingCart size={18} />
            <CartBadge className="-right-1.5 -top-1.5" />
          </Link>
          <MobileNav />
        </div>
      </div>

      <div className="border-t border-navy-100/70 px-4 pb-3 pt-3 md:hidden">
        <AiSearchBar compact />
      </div>

      <CategoryNav />
    </header>
  );
}
