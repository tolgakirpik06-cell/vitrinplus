import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Şifremi Unuttum | VitrinPlus" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />

      <main className="section-container flex flex-col gap-6 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: "Giriş Yap", href: "/giris" },
            { label: "Şifremi Unuttum" },
          ]}
        />

        <ForgotPasswordForm />
      </main>

      <Footer />
    </>
  );
}
