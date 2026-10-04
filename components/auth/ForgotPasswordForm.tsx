"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useDemo } from "@/components/demo/DemoProvider";

export function ForgotPasswordForm() {
  const { auth, ready } = useDemo();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");

    setError("");
    setSubmitting(true);

    try {
      await auth.requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "İşlem tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <MailCheck size={24} aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">E-postanı kontrol et</h1>
        <p className="mt-3 text-sm leading-6 text-navy-500">
          Bu adres için bir hesap varsa şifre yenileme bağlantısını gönderdik.
        </p>
        <p className="mt-3 text-xs text-navy-400">
          E-posta gelmediyse gereksiz (spam) klasörünü de kontrol et.
        </p>
        <Link className="mt-6 inline-block text-sm font-semibold text-brand-600" href="/giris">
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-600">VitrinPlus</p>
      <h1 className="mt-3 text-2xl font-extrabold">Şifreni mi unuttun?</h1>
      <p className="mt-3 text-sm leading-6 text-navy-500">
        E-posta adresini yaz. Şifreni yenileyebilmen için sana güvenli bir bağlantı gönderelim.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <label className="block text-xs font-semibold text-navy-600">
          E-posta
          <input
            name="email"
            required
            type="email"
            maxLength={150}
            autoComplete="email"
            placeholder="ornek@eposta.com"
            disabled={submitting}
            className="mt-1.5 block w-full rounded-xl border border-navy-100 bg-navy-50/40 p-3 text-sm font-normal"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          disabled={!ready || submitting}
          className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor…" : "Şifre yenileme bağlantısı gönder"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link className="text-brand-600" href="/giris">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
