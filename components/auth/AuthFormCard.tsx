"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LogIn, UserPlus, User, Mail, CheckCircle2 } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordField } from "@/components/auth/PasswordField";

type Mode = "giris" | "kayit";

const COPY: Record<
  Mode,
  {
    icon: typeof LogIn;
    title: string;
    subtitle: string;
    submitLabel: string;
    pendingMessage: string;
    footerQuestion: string;
    footerLinkLabel: string;
    footerLinkHref: string;
  }
> = {
  giris: {
    icon: LogIn,
    title: "Hesabına Giriş Yap",
    subtitle: "Fırsatları kaçırma, siparişlerini takip et.",
    submitLabel: "Giriş Yap",
    pendingMessage:
      "E-posta ile giriş yakında aktif olacak — şu an yalnızca arayüz önizlemesi. Hesabına bu şekilde giriş yapılmadı.",
    footerQuestion: "Hesabın yok mu?",
    footerLinkLabel: "Üye Ol",
    footerLinkHref: "/kayit",
  },
  kayit: {
    icon: UserPlus,
    title: "Hemen Üye Ol",
    subtitle: "Saniyeler içinde hesabını oluştur, alışverişe başla.",
    submitLabel: "Üye Ol",
    pendingMessage:
      "E-posta ile üyelik yakında aktif olacak — şu an yalnızca arayüz önizlemesi. Hesabın oluşturulmadı.",
    footerQuestion: "Zaten hesabın var mı?",
    footerLinkLabel: "Giriş Yap",
    footerLinkHref: "/giris",
  },
};

export function AuthFormCard({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const Icon = copy.icon;
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-navy-100/80 bg-white p-6 shadow-card sm:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={22} />
      </span>
      <h1 className="mt-4 text-xl font-extrabold text-navy-900 sm:text-2xl">{copy.title}</h1>
      <p className="mt-1.5 text-sm text-navy-400">{copy.subtitle}</p>

      <div className="mt-6">
        <OAuthButtons />
      </div>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-navy-300">
        <span className="h-px flex-1 bg-navy-100" />
        veya e-posta ile devam et
        <span className="h-px flex-1 bg-navy-100" />
      </div>

      {submitted ? (
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          {copy.pendingMessage}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "kayit" ? (
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
              Ad Soyad
              <span className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 focus-within:border-brand-300">
                <User size={16} className="shrink-0 text-navy-300" />
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  required
                  className="w-full bg-transparent text-sm font-normal text-navy-800 placeholder:text-navy-300 focus:outline-none"
                />
              </span>
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
            E-posta
            <span className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 focus-within:border-brand-300">
              <Mail size={16} className="shrink-0 text-navy-300" />
              <input
                type="email"
                placeholder="ornek@eposta.com"
                required
                className="w-full bg-transparent text-sm font-normal text-navy-800 placeholder:text-navy-300 focus:outline-none"
              />
            </span>
          </label>

          <PasswordField
            id={`${mode}-sifre`}
            label="Şifre"
            placeholder={mode === "kayit" ? "En az 8 karakter" : "••••••••"}
          />

          <button
            type="submit"
            className="mt-1 flex w-full items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,18,0.55)] transition-colors hover:bg-brand-600"
          >
            {copy.submitLabel}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-navy-400">
        {copy.footerQuestion}{" "}
        <Link href={copy.footerLinkHref} className="font-semibold text-brand-600 hover:text-brand-700">
          {copy.footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
