"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { Info } from "lucide-react";

/**
 * Google/Apple ile devam et butonları. Gerçek bir OAuth entegrasyonu henüz
 * bağlı olmadığından, tıklandığında ASLA sahte bir "giriş yapıldı" durumu
 * göstermez — dürüst bir "yakında aktif olacak" bilgisi verir (bkz. madde 4
 * ve 22: sahte başarı yerine düzgün bir "Yakında" durumu).
 */
export function OAuthButtons() {
  const [notice, setNotice] = useState<"google" | "apple" | null>(null);

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setNotice("google")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-navy-100 bg-white px-5 py-3 text-sm font-semibold text-navy-700 shadow-sm transition-colors hover:bg-navy-50"
      >
        <FcGoogle size={18} />
        Google ile devam et
      </button>
      <button
        type="button"
        onClick={() => setNotice("apple")}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border border-navy-900 bg-navy-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-900"
      >
        <FaApple size={18} />
        Apple ile devam et
      </button>

      {notice ? (
        <p className="flex items-start gap-1.5 rounded-xl bg-navy-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-navy-500">
          <Info size={13} className="mt-0.5 shrink-0 text-navy-400" />
          {notice === "google" ? "Google ile giriş" : "Apple ile giriş"} yakında aktif olacak. Şu an
          yalnızca arayüz önizlemesi — hesabına bu şekilde giriş yapılmadı.
        </p>
      ) : null}
    </div>
  );
}
