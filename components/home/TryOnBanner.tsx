import Link from "next/link";
import { ArrowRight, Camera, Shirt, Sparkles } from "lucide-react";

/** Ana sayfanın alt kısmındaki büyük "AI ile Üzerimde Gör" tanıtım bannerı. */
export function TryOnBanner() {
  return (
    <Link
      href="/kategori/kadin"
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-6 py-10 shadow-premium sm:flex-row sm:items-center sm:px-10 sm:py-12"
    >
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
        aria-hidden
      />

      <div className="relative flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-lime-300 ring-1 ring-lime-400/25">
          <Sparkles size={12} />
          Yeni
        </span>

        <h2 className="mt-4 max-w-lg text-balance text-2xl font-extrabold leading-tight text-white sm:text-3xl">
          AI ile Üzerimde Gör
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
          Beğendiğin kıyafetleri satın almadan önce kendi üzerinde gör; VitrinPlus AI
          bedenini ve tarzını anlar, sana en uygun kombini önerir.
        </p>

        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-navy-950 shadow-[0_14px_28px_-10px_rgba(163,230,53,0.5)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-lime-300">
          Ücretsiz Dene
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="relative mt-8 flex shrink-0 items-center justify-center gap-4 sm:mt-0 sm:pl-10">
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-lime-300 ring-1 ring-white/10 sm:h-28 sm:w-28">
          <Shirt size={40} />
        </span>
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-brand-300 ring-1 ring-white/10 sm:h-24 sm:w-24">
          <Camera size={34} />
        </span>
      </div>
    </Link>
  );
}
