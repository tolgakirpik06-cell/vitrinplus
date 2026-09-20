import type { Metadata } from "next";
import { SettingsPage } from "@/components/seller/pages/SettingsPage";

export const metadata: Metadata = { title: "Ayarlar" };

export default function AyarlarPage() {
  return <SettingsPage />;
}
