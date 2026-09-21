import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/** Hesabım sayfalarının ortak sayfa iskeleti (üst bilgi, içerik alanı, alt bilgi). */
export function AccountPageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="section-container py-8">{children}</main>
      <Footer />
    </>
  );
}
