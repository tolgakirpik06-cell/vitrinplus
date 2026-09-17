import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ApplicationStatusClient } from "@/components/seller-application/ApplicationStatusClient";

export const metadata: Metadata = { title: "Başvuru Durumu | VitrinPlus" };

export default function BasvuruDurumPage() {
  return (
    <>
      <Header />
      <main className="min-h-[50vh] bg-navy-50/30 py-10 sm:py-14">
        <div className="section-container">
          <ApplicationStatusClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
