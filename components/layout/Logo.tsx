import Link from "next/link";

export function Logo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <Link href="/" className="flex flex-col leading-none shrink-0">
      <span className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-[1.7rem]">
        Pazar<span className="text-brand-500">Buy</span>
      </span>
      {withTagline ? (
        <span className="mt-0.5 hidden whitespace-nowrap text-[11px] font-medium text-navy-400 sm:block">
          Ne istediğini söyle, ürün seni bulsun.
        </span>
      ) : null}
    </Link>
  );
}
