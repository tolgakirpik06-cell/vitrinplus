import Link from "next/link";

export function Logo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white shadow-[0_8px_16px_-6px_rgba(124,58,237,0.55)]">
        VP<span className="text-lime-300">+</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-[1.7rem]">
          Vitrin<span className="text-brand-500">Plus</span>
        </span>
        {withTagline ? (
          <span className="mt-0.5 hidden whitespace-nowrap text-[11px] font-medium text-navy-400 sm:block">
            Aradığın ürünler, keşfedeceğin fırsatlar.
          </span>
        ) : null}
      </span>
    </Link>
  );
}
