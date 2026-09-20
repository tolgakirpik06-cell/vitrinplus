import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoAccount } from "@/components/demo/DemoScreens";
export const metadata = { title: "Hesabım | VitrinPlus" };
export default function Page() { return <><Header /><main className="section-container space-y-6 py-8"><DemoAccount /></main><Footer /></>; }
