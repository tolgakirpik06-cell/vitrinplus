"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Info } from "lucide-react";
import { isOAuthProviderEnabled, type OAuthProviderKey } from "@/lib/supabase/env";

/**
 * Google / Apple ile devam et.
 * Sağlayıcı Supabase Dashboard'da yapılandırılıp `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` / `NEXT_PUBLIC_AUTH_APPLE_ENABLED`
 * "true" yapılana kadar buton dürüst bir "henüz etkin değil" bilgisi verir; ASLA sahte bir "giriş yapıldı" durumu göstermez.
 */
export function OAuthButtons({ onSelect, disabled = false }: { onSelect: (provider: OAuthProviderKey) => Promise<void>; disabled?: boolean }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProviderKey | null>(null);

  async function choose(provider: OAuthProviderKey) {
    const label = provider === "google" ? "Google" : "Apple";
    if (!isOAuthProviderEnabled(provider)) {
      setNotice(`${label} ile giriş henüz etkin değil. Şimdilik e-posta ve şifre ile devam edebilirsin.`);
      return;
    }
    setNotice(null);
    setPending(provider);
    try {
      await onSelect(provider); // Başarılıysa tarayıcı sağlayıcının sayfasına yönlenir.
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Giriş başlatılamadı.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={disabled || pending !== null}
        onClick={() => void choose("google")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-navy-100 bg-white px-5 py-3 text-sm font-semibold text-navy-700 shadow-sm transition-colors hover:bg-navy-50 disabled:opacity-60"
      >
        <FcGoogle size={18} />
        {pending === "google" ? "Yönlendiriliyor…" : "Google ile devam et"}
      </button>
      <button
        type="button"
        disabled={disabled || pending !== null}
        onClick={() => void choose("apple")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-navy-900 bg-navy-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:opacity-60"
      >
        <FaApple size={18} />
        {pending === "apple" ? "Yönlendiriliyor…" : "Apple ile devam et"}
      </button>
      {notice ? (
        <p role="status" className="flex items-start gap-1.5 rounded-xl bg-navy-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-navy-500">
          <Info size={13} className="mt-0.5 shrink-0 text-navy-400" />
          {notice}
        </p>
      ) : null}
    </div>
  );
}
