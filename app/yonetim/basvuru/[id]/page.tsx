import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ApplicationReviewClient } from "@/components/admin/ApplicationReviewClient";

export const metadata: Metadata = { title: "Başvuru İncelemesi | VitrinPlus", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Yönetici başvuru inceleme sayfası. /yonetim/* yolları proxy.ts ile yalnızca yönetici rolüne açıktır;
 * veri erişimi ayrıca RLS ve depolama politikalarıyla korunur (bu sayfa yalnızca arayüzdür).
 */
export default async function BasvuruIncelemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return (
    <>
      <Header />
      <main className="section-container flex flex-col gap-6 py-6">
        <ApplicationReviewClient accountId={id} />
      </main>
      <Footer />
    </>
  );
}
