"use client";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
export function ApplicationStatusClient() {
  const { shop, ready } = useDemo();
  if (!ready) return <p>Başvurun yükleniyor…</p>;
  return <section className="mx-auto max-w-lg space-y-4 rounded-2xl border border-navy-100 bg-white p-8"><h1 className="text-2xl font-bold">Başvuru durumu</h1>{shop ? <><p className="font-semibold">{shop.settings.storeName}</p><p>{shop.reference}</p><p>{shop.status === "onaylandi" ? "Onaylandı" : shop.status === "reddedildi" ? "Reddedildi" : "Onay bekliyor"}</p></> : <p>Bu demo hesabına ait başvuru bulunamadı.</p>}<Link href={shop?.status === "onaylandi" ? "/satici-panel" : "/demo"} className="block font-semibold text-brand-600">{shop?.status === "onaylandi" ? "Satıcı paneline git" : "Demo başvuru ve onay ekranı"} →</Link></section>;
}
