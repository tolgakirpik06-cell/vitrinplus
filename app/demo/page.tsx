import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoHub } from "@/components/demo/DemoScreens";
export const metadata = { title: "Demo Rehberi | VitrinPlus" };
export default function Page() { return <><Header /><main className="section-container space-y-6 py-8"><DemoHub /></main><Footer /></>; }
