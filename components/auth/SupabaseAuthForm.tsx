"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordField } from "@/components/auth/PasswordField";
import { useDemo } from "@/components/demo/DemoProvider";
import { safeNextPath } from "@/lib/auth/paths";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/credentials";

const CALLBACK_ERRORS: Record<string, string> = {
  dogrulama: "E-posta doğrulama bağlantısı geçersiz ya da süresi dolmuş. Yeniden giriş yapmayı ya da kayıt olmayı dene.",
  yapilandirma: "Giriş şu anda yapılandırılamıyor. Lütfen daha sonra tekrar dene.",
};

/** Gerçek hesap modu giriş / kayıt formu: e-posta + şifre ve OAuth. Sahte başarı yoktur; yönlendirme yalnızca Supabase'in yanıtıyla yapılır. */
export function SupabaseAuthForm({ mode }: { mode: "giris" | "kayit" }) {
  const { auth, ready } = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [error, setError] = useState(() => CALLBACK_ERRORS[params.get("hata") ?? ""] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setError("");
    setSubmitting(true);
    try {
      if (mode === "kayit") {
        const result = await auth.signUpWithPassword({ name: String(form.get("name") ?? ""), email, password, next });
        if (result.needsEmailConfirmation) {
          setConfirmEmail(email.trim());
          return;
        }
      } else {
        await auth.signInWithPassword(email, password);
      }
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "İşlem tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmEmail) {
    return (
      <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck size={24} aria-hidden /></span>
        <h1 className="mt-4 text-2xl font-extrabold">E-postanı doğrula</h1>
        <p className="mt-3 text-sm leading-6 text-navy-500">
          <strong className="text-navy-800">{confirmEmail}</strong> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra hesabın açılır. Henüz giriş yapılmadı.
        </p>
        <p className="mt-3 text-xs text-navy-400">E-posta gelmediyse gereksiz (spam) klasörüne bak. Bu adresle daha önce kayıt olduysan giriş yapmayı dene.</p>
        <Link className="mt-6 inline-block text-sm font-semibold text-brand-600" href="/giris">Giriş sayfasına git</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-600">VitrinPlus</p>
      <h1 className="mt-3 text-2xl font-extrabold">{mode === "kayit" ? "Hesabını oluştur" : "Hesabına giriş yap"}</h1>
      <p className="mt-3 text-sm leading-6 text-navy-500">
        {mode === "kayit" ? "E-posta adresin ve şifrenle üye ol. Şifren yalnızca kimlik sağlayıcıda tutulur." : "E-posta ve şifrenle giriş yap ya da Google / Apple ile devam et."}
      </p>

      <div className="mt-6">
        <OAuthButtons disabled={!ready || submitting} onSelect={(provider) => auth.signInWithOAuth(provider, next)} />
      </div>
      <p className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-navy-300"><span className="h-px flex-1 bg-navy-100" />veya<span className="h-px flex-1 bg-navy-100" /></p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "kayit" && (
          <label className="block text-xs font-semibold text-navy-600">
            Ad Soyad
            <input name="name" required minLength={2} maxLength={80} autoComplete="name" disabled={submitting} className="mt-1.5 block w-full rounded-xl border border-navy-100 bg-navy-50/40 p-3 text-sm font-normal" />
          </label>
        )}
        <label className="block text-xs font-semibold text-navy-600">
          E-posta
          <input name="email" required type="email" maxLength={150} placeholder="ornek@eposta.com" autoComplete="email" disabled={submitting} className="mt-1.5 block w-full rounded-xl border border-navy-100 bg-navy-50/40 p-3 text-sm font-normal" />
        </label>
        <PasswordField id="password" name="password" label="Şifre" placeholder={mode === "kayit" ? `En az ${PASSWORD_MIN_LENGTH} karakter, harf ve rakam` : "Şifren"} autoComplete={mode === "kayit" ? "new-password" : "current-password"} required minLength={mode === "kayit" ? PASSWORD_MIN_LENGTH : undefined} maxLength={72} disabled={submitting} />
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={!ready || submitting} className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50">
          {submitting ? "Lütfen bekle…" : mode === "kayit" ? "Üye ol" : "Giriş yap"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link className="text-brand-600" href={mode === "kayit" ? `/giris${next !== "/hesabim" ? `?next=${encodeURIComponent(next)}` : ""}` : `/kayit${next !== "/hesabim" ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {mode === "kayit" ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Üye ol"}
        </Link>
      </p>
    </div>
  );
}
