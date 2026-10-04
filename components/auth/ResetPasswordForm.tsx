"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/PasswordField";
import { useDemo } from "@/components/demo/DemoProvider";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/auth/credentials";

export function ResetPasswordForm() {
  const { auth, ready } = useDemo();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    setError("");

    if (password !== confirmPassword) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setSubmitting(true);

    try {
      await auth.updatePassword(password);
      router.replace("/giris?sifre=yenilendi");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Şifre yenilenemedi. Bağlantının süresi dolmuş olabilir."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-600">VitrinPlus</p>
      <h1 className="mt-3 text-2xl font-extrabold">Yeni şifreni belirle</h1>

      <p className="mt-3 text-sm leading-6 text-navy-500">
        Yeni şifren en az {PASSWORD_MIN_LENGTH} karakter olmalı ve en az bir harf ile bir rakam içermeli.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <PasswordField
          id="password"
          name="password"
          label="Yeni şifre"
          placeholder={`En az ${PASSWORD_MIN_LENGTH} karakter, harf ve rakam`}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={submitting}
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Yeni şifre tekrar"
          placeholder="Yeni şifreni tekrar yaz"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={submitting}
        />

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          disabled={!ready || submitting}
          className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "Kaydediliyor…" : "Yeni şifreyi kaydet"}
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
