import type { Metadata } from "next";
import { OrdersPage } from "@/components/seller/orders/OrdersPage";

export const metadata: Metadata = { title: "Siparişler" };

export default function SiparislerPage() {
  return <OrdersPage />;
}
