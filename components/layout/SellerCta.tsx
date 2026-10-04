"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { useMarketplace } from "@/components/marketplace/context";
import { cn } from "@/lib/utils";

type SellerCtaProps = {
  className?: string;
  onNavigate?: () => void;
  variant?: "button" | "link";
};

export function SellerCta({
  className,
  onNavigate,
  variant = "button",
}: SellerCtaProps) {
  const { ready, mode, sellerAccount, shop, signedIn, user } = useMarketplace();

  if (!ready || (mode === "supabase" && signedIn && !user)) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-9 w-[168px] shrink-0 animate-pulse rounded-full bg-navy-50",
          className
        )}
      />
    );
  }

  const approved =
    mode === "supabase"
      ? sellerAccount?.status === "approved"
      : shop?.status === "onaylandi";

  const hasApplication = mode === "supabase" ? Boolean(sellerAccount) : Boolean(shop);

  const href = approved
    ? "/satici-panel"
    : hasApplication
      ? "/satici-basvuru/durum"
      : "/satici-basvuru";

  const label = approved
    ? "Satıcı Paneli"
    : hasApplication
      ? "Başvuru Durumu"
      : "Mağaza Aç";

  if (variant === "link") {
    return (
      <Link href={href} onClick={onNavigate} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "inline-flex h-9 w-[168px] shrink-0 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600",
        className
      )}
    >
      <Store size={15} />
      {label}
    </Link>
  );
}
