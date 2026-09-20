import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Campaign } from "@/types";
import { HeroProductShowcase } from "./HeroProductShowcase";
import { heroShowcaseProducts } from "@/data/hero-showcase";

/**
 * Ana sayfanın gerçek "hero" alanı. Sol tarafta kampanya metni + CTA, sağ
 * tarafta gerçek ürünleri (fiyat/indirim/rozet ile) gösteren, kullanıcının
 * oklarla gezebildiği tıklanabilir bir vitrin var — böylece kullanıcı daha
 * sayfaya girer girmez gerçek bir pazaryerinde olduğunu hisseder. AI
 * özelliği tamamen kaldırılmadı ama küçük, tek satırlık bir ipucu olarak
 * korunuyor — ayrı bir arama alanı YOK (header'daki arama ile tekrar
 * etmemesi için).
 */
export function HeroBanner({ campaign }: { campaign: Campaign }) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 shadow-premium sm:flex-row sm:items-center">
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex-1 px-6 py-8 sm:px-9 sm:py-10 lg:px-10">
        <span className="inline-flex items-center rounded-full bg-brand-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-300 ring-1 ring-brand-500/25">
          {campaign.badge}
        </span>

        <h1 className="mt-4 max-w-md text-balance text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          {campaign.title}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-white/70 sm:text-base">{campaign.subtitle}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={campaign.href}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-10px_rgba(124,58,237,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600"
          >
            {campaign.ctaLabel}
            <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-white/50">
          <Sparkles size={13} className="text-brand-400" />
          Ne istediğini söyle, <span className="text-white/80">ürün seni bulsun.</span>
        </p>
      </div>

      <div className="relative w-full shrink-0 px-6 pb-6 sm:w-[15rem] sm:px-3 sm:pb-0 sm:pr-6 md:w-[18rem] lg:w-[20rem] lg:pr-8">
        <HeroProductShowcase products={heroShowcaseProducts} />
      </div>
    </div>
  );
}
