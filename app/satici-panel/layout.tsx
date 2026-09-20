import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SellerLayoutClient } from "@/components/seller/SellerLayoutClient";

export const metadata: Metadata = {
  title: { template: "%s | VitrinPlus Satıcı Paneli", default: "Satıcı Paneli | VitrinPlus" },
  robots: { index: false, follow: false },
};

export default function SellerPanelLayout({ children }: { children: ReactNode }) {
  return <SellerLayoutClient>{children}</SellerLayoutClient>;
}
