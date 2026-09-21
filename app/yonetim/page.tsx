import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminClient } from "@/components/admin/AdminClient";

export const metadata: Metadata = { title: "Yönetim | VitrinPlus", robots: { index: false, follow: false } };

export default function YonetimPage() {
  return (
    <>
      <Header />
      <main className="section-container flex flex-col gap-6 py-6">
        <AdminClient />
      </main>
      <Footer />
    </>
  );
}
