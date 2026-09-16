import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import "./globals.css";

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
  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen bg-[#f7f8fb] font-sans antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
