import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoOrders } from "@/components/demo/DemoScreens";
export const metadata = { title: "Siparişlerim | VitrinPlus" };
export default function Page() { return <><Header /><main className="section-container space-y-6 py-8"><h1 className="text-2xl font-bold">Siparişlerim</h1><DemoOrders /></main><Footer /></>; }
