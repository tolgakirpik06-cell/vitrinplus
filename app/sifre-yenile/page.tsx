import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Yeni Şifre Belirle | VitrinPlus" };

export default function ResetPasswordPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: "Giriş Yap", href: "/giris" },
            { label: "Yeni Şifre Belirle" },
          ]}
        />

        <ResetPasswordForm />
      </main>

      <Footer />
    </>
  );
}
