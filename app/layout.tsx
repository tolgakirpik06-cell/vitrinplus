import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import "./globals.css";
import { DemoProvider } from "@/components/demo/DemoProvider";
import { DemoBar } from "@/components/demo/DemoScreens";
import { SupabaseMarketplaceProvider } from "@/components/marketplace/SupabaseMarketplaceProvider";
import { SyncStatusBar } from "@/components/marketplace/SyncStatusBar";
import { describeConfigProblem, getPublicConfigResult } from "@/lib/supabase/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : process.env.VERCEL_PROJECT_PRODUCTION_URL ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) : undefined,
  title: "VitrinPlus | Vitrin senin. Seçim senin.",
  description:
    "VitrinPlus, moda, teknoloji ve güzellikte editoryal bir alışveriş deneyimi sunan yeni nesil pazaryeri. Binlerce satıcının ürünlerini karşılaştırır, sana en uygun seçimi bulur. Satıcılara %0 komisyon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getPublicConfigResult fails fast in production; development may still use demo.
  const config = getPublicConfigResult();
  const content = (
    <CartProvider>
      <DemoBar />
      <FavoritesProvider>{children}</FavoritesProvider>
      <SyncStatusBar />
    </CartProvider>
  );
  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen bg-[#f7f8fb] font-sans antialiased">
        {config.ok ? <SupabaseMarketplaceProvider>{content}</SupabaseMarketplaceProvider> : <DemoProvider configProblem={describeConfigProblem(config)}>{content}</DemoProvider>}
      </body>
    </html>
  );
}
