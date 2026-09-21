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
  title: "VitrinPlus | Vitrin senin. Seçim senin.",
  description:
    "VitrinPlus, moda, teknoloji ve güzellikte editoryal bir alışveriş deneyimi sunan yeni nesil pazaryeri. Binlerce satıcının ürünlerini karşılaştırır, sana en uygun seçimi bulur. Satıcılara %0 komisyon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Supabase ortam değişkenleri geçerliyse gerçek hesap modu, yoksa Aşama 1 demo modu (tarayıcıda saklanır).
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
